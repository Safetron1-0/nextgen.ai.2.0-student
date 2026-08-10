package com.nextgen.placementportal.controller;

import com.nextgen.placementportal.model.Application;
import com.nextgen.placementportal.model.Company;
import com.nextgen.placementportal.model.Student;
import com.nextgen.placementportal.repository.ApplicationRepository;
import com.nextgen.placementportal.repository.CompanyRepository;
import com.nextgen.placementportal.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private StudentRepository studentRepository;

    // GET /api/companies - List all companies with dynamic selected student count
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCompanies() {
        List<Company> companies = companyRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Company company : companies) {
            Map<String, Object> companyMap = new LinkedHashMap<>();
            companyMap.put("id", company.getId());
            companyMap.put("name", company.getName());
            companyMap.put("industry", company.getIndustry());
            companyMap.put("website", company.getWebsite());
            companyMap.put("logoUrl", company.getLogoUrl());

            // Dynamically count how many students are SELECTED at this company
            List<Application> selectedApps = applicationRepository
                    .findByCompanyIdAndStatus(company.getId(), "SELECTED");
            companyMap.put("selectedCount", selectedApps.size());

            // Include selected student names for quick display
            List<Map<String, Object>> selectedStudents = new ArrayList<>();
            for (Application app : selectedApps) {
                Optional<Student> student = studentRepository.findById(app.getStudentId());
                if (student.isPresent()) {
                    Map<String, Object> studentInfo = new LinkedHashMap<>();
                    studentInfo.put("studentId", student.get().getId());
                    studentInfo.put("studentName", student.get().getName());
                    studentInfo.put("role", app.getRole());
                    studentInfo.put("packageLpa", app.getPackageLpa());
                    studentInfo.put("date", app.getDate());
                    selectedStudents.add(studentInfo);
                }
            }
            companyMap.put("selectedStudents", selectedStudents);

            result.add(companyMap);
        }

        return ResponseEntity.ok(result);
    }

    // GET /api/companies/{id} - Get company detail with ALL applications (not just selected)
    @GetMapping("/{id}")
    public ResponseEntity<?> getCompanyById(@PathVariable Long id) {
        Optional<Company> optCompany = companyRepository.findById(id);
        if (optCompany.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Company not found.");
        }

        Company company = optCompany.get();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", company.getId());
        result.put("name", company.getName());
        result.put("industry", company.getIndustry());
        result.put("website", company.getWebsite());
        result.put("logoUrl", company.getLogoUrl());

        // Get ALL applications for this company (dynamic - any student who applied)
        List<Application> allApps = applicationRepository.findByCompanyId(company.getId());
        List<Map<String, Object>> applications = new ArrayList<>();

        for (Application app : allApps) {
            Optional<Student> student = studentRepository.findById(app.getStudentId());
            Map<String, Object> appInfo = new LinkedHashMap<>();
            appInfo.put("applicationId", app.getId());
            appInfo.put("studentId", app.getStudentId());
            appInfo.put("studentName", student.map(Student::getName).orElse("Unknown"));
            appInfo.put("role", app.getRole());
            appInfo.put("status", app.getStatus());
            appInfo.put("nextAction", app.getNextAction());
            appInfo.put("date", app.getDate());
            appInfo.put("packageLpa", app.getPackageLpa());
            applications.add(appInfo);
        }

        result.put("applications", applications);
        result.put("totalApplications", applications.size());
        result.put("selectedCount", allApps.stream()
                .filter(a -> "SELECTED".equals(a.getStatus())).count());

        return ResponseEntity.ok(result);
    }

    // POST /api/companies - Add new company (coordinator)
    @PostMapping
    public ResponseEntity<?> createCompany(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Company name is required.");
        }
        if (companyRepository.findByName(name).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Company already exists.");
        }
        Company company = new Company(name, body.getOrDefault("industry", "IT"));
        company.setWebsite(body.get("website"));
        companyRepository.save(company);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", company.getId());
        result.put("name", company.getName());
        result.put("industry", company.getIndustry());
        result.put("website", company.getWebsite());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // DELETE /api/companies/{id} - Remove company (coordinator)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCompany(@PathVariable Long id) {
        if (!companyRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Company not found.");
        }
        companyRepository.deleteById(id);
        return ResponseEntity.ok("Company deleted.");
    }
}
