import { useState, useEffect } from 'react';

// Función para extraer la primera imagen del README
const extractImageFromMarkdown = (markdown, repoUrl) => {
  if (!markdown) return null;
  
  // Buscar imágenes en formato markdown: ![alt](url)
  const mdImageMatch = markdown.match(/!\[.*?\]\((.*?)\)/);
  if (mdImageMatch && mdImageMatch[1]) {
    let imageUrl = mdImageMatch[1];
    // Si es una URL relativa, convertirla a absoluta
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${repoUrl}/raw/main/${imageUrl}`.replace('//', '/').replace(':/', '://');
    }
    return imageUrl;
  }
  
  // Buscar imágenes en formato HTML: <img src="url">
  const htmlImageMatch = markdown.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImageMatch && htmlImageMatch[1]) {
    let imageUrl = htmlImageMatch[1];
    // Si es una URL relativa, convertirla a absoluta
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${repoUrl}/raw/main/${imageUrl}`.replace('//', '/').replace(':/', '://');
    }
    return imageUrl;
  }
  
  return null;
};

// Función para extraer descripción del README
const extractDescriptionFromMarkdown = (markdown) => {
  if (!markdown) return null;
  
  // Eliminar el título principal (# Título)
  let content = markdown.replace(/^#\s+.*$/m, '');
  
  // Eliminar badges/shields
  content = content.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '');
  content = content.replace(/!\[.*?\]\(https:\/\/img\.shields\.io.*?\)/g, '');
  
  // Eliminar imágenes
  content = content.replace(/!\[.*?\]\(.*?\)/g, '');
  
  // Eliminar links de tipo [texto](url) pero mantener el texto
  content = content.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Obtener los primeros párrafos (hasta 200 caracteres)
  const paragraphs = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 20 && !line.startsWith('#') && !line.startsWith('```'))
    .join(' ')
    .trim();
  
  if (paragraphs.length > 200) {
    return paragraphs.substring(0, 200) + '...';
  }
  
  return paragraphs || null;
};

// Función para obtener el README de un repo
const fetchReadme = async (owner, repo) => {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3.raw'
    };
    
    // Añadir token si existe
    if (import.meta.env.VITE_GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers }
    );
    
    if (!response.ok) return null;
    const readme = await response.text();
    return readme;
  } catch (error) {
    console.log(`No se pudo obtener README para ${repo}`);
    return null;
  }
};

export const useGitHubRepos = (username) => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const fetchRepos = async () => {
      try {
        setLoading(true);
        
        // Headers para la petición - añadir token si existe en variables de entorno
        const headers = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
        // Si hay un token de GitHub, usarlo (opcional, mejora el rate limit)
        if (import.meta.env.VITE_GITHUB_TOKEN) {
          headers['Authorization'] = `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`;
        }
        
        const response = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
          { headers }
        );
        
        // Verificar rate limit
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const resetTime = response.headers.get('X-RateLimit-Reset');
        
        console.log(`GitHub API - Peticiones restantes: ${remaining}`);
        
        if (!response.ok) {
          if (response.status === 403) {
            const resetDate = new Date(resetTime * 1000);
            throw new Error(`Límite de API alcanzado. Se reiniciará a las ${resetDate.toLocaleTimeString()}`);
          }
          if (response.status === 404) {
            throw new Error(`Usuario "${username}" no encontrado en GitHub`);
          }
          throw new Error(`Error ${response.status}: No se pudieron cargar los repositorios`);
        }

        const data = await response.json();
        
        // Filtrar repos fork, privados, README de perfil y portfolio
        const filteredRepos = data.filter(repo => {
          // Excluir forks y privados
          if (repo.fork || repo.private) return false;
          
          // Excluir repo del README de perfil (mismo nombre que el usuario)
          if (repo.name.toLowerCase() === username.toLowerCase()) return false;
          
          // Excluir repos de portfolio (variaciones comunes)
          const portfolioNames = ['portfolio', 'portfolio_v', 'portfolio-main', 'my-portfolio'];
          if (portfolioNames.some(name => repo.name.toLowerCase().includes(name))) return false;
          
          return true;
        });

        // Crear proyectos básicos sin README primero (carga más rápida)
        const basicRepos = filteredRepos.map(repo => ({
          name: repo.name,
          summary: repo.description || 'Sin descripción',
          url: repo.html_url,
          image: null,
          stars: repo.stargazers_count,
          language: repo.language,
          updated_at: repo.updated_at,
          isGitHubRepo: true
        }));

        // Mostrar repos inmediatamente
        setRepos(basicRepos);
        setError(null);
        setLoading(false);

        // Obtener README solo de los primeros 10 repos para no saturar la API
        // Esto se hace en segundo plano sin bloquear la UI
        const topRepos = filteredRepos.slice(0, 10);
        const reposWithReadme = await Promise.all(
          topRepos.map(async (repo, index) => {
            try {
              const readme = await fetchReadme(username, repo.name);
              const image = extractImageFromMarkdown(readme, repo.html_url);
              const description = extractDescriptionFromMarkdown(readme);
              
              return {
                ...basicRepos[index],
                summary: description || repo.description || 'Sin descripción',
                image: image || null
              };
            } catch (err) {
              console.log(`Error obteniendo README de ${repo.name}:`, err);
              return basicRepos[index];
            }
          })
        );

        // Actualizar con información de README
        const finalRepos = basicRepos.map((repo, index) => 
          index < 10 ? reposWithReadme[index] : repo
        );
        
        setRepos(finalRepos);
      } catch (err) {
        console.error('Error fetching GitHub repos:', err);
        setError(err.message);
        setRepos([]);
        setLoading(false);
      }
    };

    fetchRepos();
  }, [username]);

  return { repos, loading, error };
};
