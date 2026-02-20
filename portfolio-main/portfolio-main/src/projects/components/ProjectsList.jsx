import { SiGithub } from "react-icons/si";

const DEFAULT_IMAGE = "/home/default-project.webp";

export const ProjectsList = ({ projects }) => {
  return (
    <ul className="animated-list grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9">
      {projects.map((project) => (
        <li key={project.url} className="transition-opacity">
          <a
            href={project.url}
            target="_blank"
            rel="no-referrer"
            className="space-y-4 block group"
          >
            <div className="aspect-video overflow-hidden rounded-md bg-box-light dark:bg-box-dark relative">
              <img
                src={project.image || DEFAULT_IMAGE}
                alt={project.name}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Si falla la imagen, usar la default
                  e.target.src = DEFAULT_IMAGE;
                  e.target.onerror = null; // Evitar loop infinito
                }}
              />
              
              {/* Badge de destacado */}
              {project.isFeatured && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                  ⭐ Outstanding
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-tight text-title-light dark:text-title-dark group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {project.name}
                </p>
                {project.isGitHubRepo && (
                  <SiGithub className="text-lg text-text-light/40 dark:text-text-dark/40 flex-shrink-0 mt-0.5" />
                )}
              </div>
              
              <p className="text-text-light dark:text-text-dark text-sm line-clamp-2">
                {project.summary}
              </p>
              
              {/* Información adicional para repos de GitHub */}
              {project.isGitHubRepo && (
                <div className="flex gap-3 text-xs text-text-light/70 dark:text-text-dark/70">
                  {project.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {project.language}
                    </span>
                  )}
                  {project.stars > 0 && (
                    <span className="flex items-center gap-1">
                      ⭐ {project.stars}
                    </span>
                  )}
                </div>
              )}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
};
