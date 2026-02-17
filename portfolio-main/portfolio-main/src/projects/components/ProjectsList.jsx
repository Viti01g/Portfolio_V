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
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Si falla la imagen, usar la default
                  if (e.target.src !== window.location.origin + DEFAULT_IMAGE) {
                    e.target.src = DEFAULT_IMAGE;
                  } else {
                    // Si incluso la default falla, mostrar ícono de GitHub
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                    const icon = document.createElement('div');
                    icon.className = 'text-4xl text-text-light/30 dark:text-text-dark/30';
                    icon.innerHTML = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path></svg>';
                    e.target.parentElement.appendChild(icon);
                  }
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
