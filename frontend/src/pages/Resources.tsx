import { useEffect, useState } from "react";
import { BookOpen, FileText, Video, Link as LinkIcon, ExternalLink, Search } from "lucide-react";
import { resourceApi } from "../api/api";
import Navbar from "../components/Navbar";

interface ResourceItem {
  id: number;
  title: string;
  description: string;
  url: string;
  category: string;
  fileType: string;
  createdAt: string;
}

const CATEGORIES = ["All", "DSA", "DBMS", "OOPs", "SQL", "Cloud", "CN"];

export default function Resources() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadResources(); }, [activeCategory]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await resourceApi.getAll(activeCategory === "All" ? undefined : activeCategory);
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load resources:", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = searchQuery
    ? resources.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : resources;

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "PDF": return <FileText size={24} className="resource-icon pdf" />;
      case "VIDEO": return <Video size={24} className="resource-icon video" />;
      case "LINK": return <LinkIcon size={24} className="resource-icon link" />;
      default: return <BookOpen size={24} className="resource-icon default" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "DSA": return "cat-dsa";
      case "DBMS": return "cat-dbms";
      case "OOPs": return "cat-oops";
      case "SQL": return "cat-sql";
      case "Cloud": return "cat-cloud";
      case "CN": return "cat-cn";
      default: return "";
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <BookOpen size={28} className="page-icon" />
            <div>
              <h1>Resources</h1>
              <p>Study materials, interview prep, and placement guides</p>
            </div>
          </div>
        </div>

        {/* Search & Category Filters */}
        <div className="resources-controls">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="category-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`category-tab ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading resources...</p></div>
        ) : filteredResources.length === 0 ? (
          <div className="empty-page">
            <BookOpen size={64} className="empty-icon" />
            <h3>No resources found</h3>
            <p>{searchQuery ? "Try a different search term." : "Resources will appear here when added by coordinators."}</p>
          </div>
        ) : (
          <div className="resources-grid">
            {filteredResources.map(resource => (
              <div key={resource.id} className="resource-card">
                <div className="resource-card-header">
                  {getFileIcon(resource.fileType)}
                  <span className={`category-badge ${getCategoryColor(resource.category)}`}>{resource.category}</span>
                </div>
                <h4>{resource.title}</h4>
                {resource.description && <p className="resource-desc">{resource.description}</p>}
                {resource.url && (
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                    Open Resource <ExternalLink size={14} />
                  </a>
                )}
                <div className="resource-footer">
                  <span className="file-type-tag">{resource.fileType}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
