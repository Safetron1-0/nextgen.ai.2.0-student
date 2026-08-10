import { useEffect, useState } from "react";
import { Building2, Globe, Users, ChevronDown, ChevronUp, ExternalLink, CheckCircle } from "lucide-react";
import { companyApi } from "../api/api";
import Navbar from "../components/Navbar";

interface SelectedStudent {
  studentId: number;
  studentName: string;
  role: string;
  packageLpa: number | null;
  date: string;
}

interface CompanyItem {
  id: number;
  name: string;
  industry: string;
  website: string;
  logoUrl: string | null;
  selectedCount: number;
  selectedStudents: SelectedStudent[];
}

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await companyApi.getAll();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load companies:", err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const totalSelected = companies.reduce((sum, c) => sum + (c.selectedCount || 0), 0);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <Building2 size={28} className="page-icon" />
            <div>
              <h1>Companies</h1>
              <p>{companies.length} companies visited • {totalSelected} student{totalSelected !== 1 ? "s" : ""} selected</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading companies...</p></div>
        ) : companies.length === 0 ? (
          <div className="empty-page">
            <Building2 size={64} className="empty-icon" />
            <h3>No companies added yet</h3>
            <p>Companies will appear here when added to the system.</p>
          </div>
        ) : (
          <div className="company-grid">
            {companies.map(company => (
              <div key={company.id} className={`company-card ${expandedId === company.id ? "expanded" : ""}`}>
                <div className="company-card-top" onClick={() => toggleExpand(company.id)}>
                  <div className="company-card-header">
                    <div className="company-avatar">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="company-info">
                      <h3>{company.name}</h3>
                      <span className="company-industry">{company.industry}</span>
                    </div>
                    <div className="company-card-right">
                      {company.selectedCount > 0 && (
                        <span className="selected-badge">
                          <CheckCircle size={14} />
                          {company.selectedCount} Selected
                        </span>
                      )}
                      {expandedId === company.id
                        ? <ChevronUp size={18} className="chevron-icon" />
                        : <ChevronDown size={18} className="chevron-icon" />
                      }
                    </div>
                  </div>

                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="company-website"
                      onClick={e => e.stopPropagation()}
                    >
                      <Globe size={14} /> {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Expanded: Show selected students dynamically */}
                {expandedId === company.id && (
                  <div className="company-detail-panel">
                    {company.selectedStudents && company.selectedStudents.length > 0 ? (
                      <>
                        <h4><Users size={16} /> Selected Students</h4>
                        <div className="selected-students-list">
                          {company.selectedStudents.map((s, idx) => (
                            <div key={idx} className="selected-student-row">
                              <div className="student-avatar-sm">
                                {s.studentName.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="student-detail">
                                <span className="student-name-text">{s.studentName}</span>
                                <span className="student-role-text">{s.role}</span>
                              </div>
                              {s.packageLpa && (
                                <span className="package-badge">{s.packageLpa} LPA</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="no-selection-text">No students selected at this company yet.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
