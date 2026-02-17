import { useState, useMemo } from "react";
import cv from "../../cv.json";
import { ProjectsList } from "./components/ProjectsList";
import { SiGithub } from "react-icons/si";
import { useGitHubRepos } from "../hooks/useGitHubRepos";

export const ProjectsPage = () => {
  const { projects, fast_links } = cv.home;
  const githubUrl = fast_links.find(link => link.name === "GitHub")?.url;
  
  // Extraer username de GitHub de la URL
  const githubUsername = githubUrl ? githubUrl.split('github.com/')[1]?.replace('/', '') : null;
  
  // Obtener repos de GitHub
  const { repos: githubRepos, loading, error } = useGitHubRepos(githubUsername);
  
  // Estado para filtro
  const [filter, setFilter] = useState('all'); // 'all', 'featured', 'github'
  
  // Combinar y filtrar proyectos
  const allProjects = useMemo(() => {
    // Marcar proyectos destacados
    const featuredProjects = projects.map(p => ({ ...p, isFeatured: true }));
    
    // Filtrar repos de GitHub que no estén ya en proyectos destacados
    const featuredUrls = new Set(projects.map(p => p.url.toLowerCase()));
    const uniqueGithubRepos = githubRepos.filter(
      repo => !featuredUrls.has(repo.url.toLowerCase())
    );
    
    // Combinar según filtro
    if (filter === 'featured') return featuredProjects;
    if (filter === 'github') return uniqueGithubRepos;
    
    // 'all': destacados primero, luego GitHub repos
    return [...featuredProjects, ...uniqueGithubRepos];
  }, [projects, githubRepos, filter]);

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <div>
        <h1 className="animate-in text-3xl font-bold tracking-tight text-title-light dark:text-title-dark">
          Projects
        </h1>
        <p className="animate-in text-text-light dark:text-text-dark">
          A collection of my work and side projects.
        </p>
        {githubUrl && (
          <div className="animate-in mt-6 flex items-center gap-2 text-text-light dark:text-text-dark">
            <span>✨ Proyectos sincronizados automáticamente desde</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-semibold transition-all hover:gap-3"
            >
              <SiGithub className="text-xl" />
              <span>GitHub</span>
            </a>
          </div>
        )}
        
        {/* Filtros */}
        <div className="animate-in mt-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-box-light dark:bg-box-dark text-text-light dark:text-text-dark hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            All ({projects.length + githubRepos.filter(r => !projects.some(p => p.url.toLowerCase() === r.url.toLowerCase())).length})
          </button>
          <button
            onClick={() => setFilter('featured')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'featured'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-box-light dark:bg-box-dark text-text-light dark:text-text-dark hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            ⭐ Outstanding ({projects.length})
          </button>
          <button
            onClick={() => setFilter('github')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'github'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-box-light dark:bg-box-dark text-text-light dark:text-text-dark hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            <SiGithub className="inline mr-1" />
            Repositories ({githubRepos.length})
          </button>
        </div>
      </div>

      <div className="animate-in" style={{ "--index": 1 }}>
        {loading && (
          <div className="text-center py-12 text-text-light dark:text-text-dark">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4">Cargando proyectos de GitHub...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        
        {!loading && <ProjectsList projects={allProjects} />}
      </div>
    </div>
  );
};

export default ProjectsPage;
