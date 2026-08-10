"""
profile_fetcher.py
Fetches student profile, applications, stats, on-duty requests,
and available resources from the Spring Boot backend.
Uses the JWT token forwarded from the frontend for authenticated requests.
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

SPRING_BOOT_BASE_URL = os.getenv("SPRING_BOOT_BASE_URL", "http://localhost:8080")


async def fetch_student_profile(username: str, token: str) -> dict:
    """
    Fetch the student's profile from Spring Boot: /api/students/me?username={username}
    Returns a dict with name, email, department, year, cgpa, phone, etc.
    """
    url = f"{SPRING_BOOT_BASE_URL}/api/students/me"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"username": username}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"[profile_fetcher] HTTP error fetching profile: {e}")
            return {}
        except Exception as e:
            print(f"[profile_fetcher] Error fetching profile: {e}")
            return {}


async def fetch_student_applications(username: str, token: str) -> list:
    """
    Fetch the student's applications from Spring Boot: /api/applications/my?username={username}
    Returns a list of application dicts with companyName, role, status, nextAction, date, packageLpa.
    """
    url = f"{SPRING_BOOT_BASE_URL}/api/applications/my"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"username": username}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"[profile_fetcher] HTTP error fetching applications: {e}")
            return []
        except Exception as e:
            print(f"[profile_fetcher] Error fetching applications: {e}")
            return []


async def fetch_student_stats(username: str, token: str) -> dict:
    """
    Fetch the student's application stats from Spring Boot:
    /api/applications/my/stats?username={username}
    Returns dict: { applied, shortlisted, nextRound, selected, rejected, total }
    """
    url = f"{SPRING_BOOT_BASE_URL}/api/applications/my/stats"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"username": username}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[profile_fetcher] Error fetching stats: {e}")
            return {}


async def fetch_on_duty_requests(username: str, token: str) -> list:
    """
    Fetch the student's on-duty requests: /api/on-duty/my?username={username}
    Returns a list of on-duty request dicts with title, reason, fromDate, toDate, status.
    """
    url = f"{SPRING_BOOT_BASE_URL}/api/on-duty/my"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"username": username}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[profile_fetcher] Error fetching on-duty requests: {e}")
            return []


async def fetch_resources(token: str) -> list:
    """
    Fetch all available placement resources (study materials, links):
    /api/resources
    Returns list of resource dicts with title, category, description, url.
    """
    url = f"{SPRING_BOOT_BASE_URL}/api/resources"
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[profile_fetcher] Error fetching resources: {e}")
            return []


async def fetch_all_companies(token: str) -> list:
    """
    Fetch all companies currently in the system:
    /api/companies
    Returns list of company dicts with id, name, industry, website.
    """
    url = f"{SPRING_BOOT_BASE_URL}/api/companies"
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[profile_fetcher] Error fetching companies: {e}")
            return []


async def get_full_student_context(username: str, token: str) -> dict:
    """
    Aggregates profile + applications + stats + on-duty + resources + companies
    into a single context dict. This is the master function used by the RAG pipeline.
    All fetches are done in parallel for speed.
    """
    profile, applications, stats, on_duty, resources, companies = await asyncio.gather(
        fetch_student_profile(username, token),
        fetch_student_applications(username, token),
        fetch_student_stats(username, token),
        fetch_on_duty_requests(username, token),
        fetch_resources(token),
        fetch_all_companies(token),
        return_exceptions=False,
    )

    return {
        "profile": profile,
        "applications": applications,
        "stats": stats,
        "on_duty": on_duty,
        "resources": resources,
        "companies": companies,
        "username": username,
    }
