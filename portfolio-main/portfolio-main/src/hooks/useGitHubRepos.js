import { useState, useEffect, useRef, useCallback } from 'react';

const CACHE_KEY = 'github_repos_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Leer caché de localStorage
const getCache = (username) => {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${username}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.data;
  } catch {
    return null;
  }
};

// Guardar caché en localStorage
const setCache = (username, data) => {
  try {
    localStorage.setItem(`${CACHE_KEY}_${username}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch {
    // localStorage lleno o no disponible
  }
};

// Generar imagen Open Graph de GitHub (siempre disponible para repos públicos)
const getGitHubOGImage = (owner, repoName) => {
  return `https://opengraph.githubassets.com/1/${owner}/${repoName}`;
};

// Función para extraer la primera imagen del README
const extractImageFromMarkdown = (markdown, repoUrl) => {
  if (!markdown) return null;
  
  // Buscar imágenes en formato markdown: ![alt](url)
  const mdImageMatch = markdown.match(/!\[.*?\]\((.*?)\)/);
  if (mdImageMatch && mdImageMatch[1]) {
    let imageUrl = mdImageMatch[1].trim();
    
    // Si es una URL absoluta, devolverla tal cual
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Si es una URL relativa, convertirla a absoluta
    // Limpiar barras al inicio
    imageUrl = imageUrl.replace(/^\.?\/+/, '');
    
    // Construir URL raw de GitHub (intentar con main)
    return `${repoUrl}/raw/main/${imageUrl}`;
  }
  
  // Buscar imágenes en formato HTML: <img src="url">
  const htmlImageMatch = markdown.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImageMatch && htmlImageMatch[1]) {
    let imageUrl = htmlImageMatch[1].trim();
    
    // Si es una URL absoluta, devolverla tal cual
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Si es una URL relativa, convertirla a absoluta
    imageUrl = imageUrl.replace(/^\.?\/+/, '');
    
    return `${repoUrl}/raw/main/${imageUrl}`;
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
  // Usar try-catch para manejar errores sin que aparezcan en consola
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
      { 
        headers,
        // Suprimir errores 404 en consola
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      }
    ).catch(() => null);
    
    // Si fetch falló, retornar null
    if (!response) return null;
    
    // Si es 404, el repo no tiene README - esto es normal
    if (response.status === 404) return null;
    
    // Si hay otro error, retornar null sin loguear
    if (!response.ok) return null;
    
    const readme = await response.text();
    return readme;
  } catch (error) {
    // Manejar errores silenciosamente
    return null;
  }
};

export const useGitHubRepos = (username) => {
  const [repos, setRepos] = useState(() => {
    if (username) {
      const cached = getCache(username);
      if (cached) return cached;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (username) return !getCache(username);
    return true;
  });
  const [error, setError] = useState(null);
  const reposRef = useRef([]);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const cached = getCache(username);
    if (cached && cached.length > 0) {
      reposRef.current = [...cached];
      setRepos([...cached]);
      setLoading(false);
    }

    let cancelled = false;

    const fetchRepos = async () => {
      try {
        if (!cached || cached.length === 0) {
          setLoading(true);
        }
        
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (import.meta.env.VITE_GITHUB_TOKEN) {
          headers['Authorization'] = `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`;
        }
        
        const response = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
          { headers }
        );
        
        const remaining = response.headers.get('X-RateLimit-Remaining');
        
        if (!response.ok) {
          if (response.status === 403 && cached && cached.length > 0) {
            console.warn('GitHub API rate limit - usando caché');
            return;
          }
          if (response.status === 403) {
            const resetTime = response.headers.get('X-RateLimit-Reset');
            const resetDate = new Date(resetTime * 1000);
            throw new Error(`Límite de API alcanzado. Se reiniciará a las ${resetDate.toLocaleTimeString()}`);
          }
          if (response.status === 404) {
            throw new Error(`Usuario "${username}" no encontrado en GitHub`);
          }
          throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();
        
        const filteredRepos = data.filter(repo => {
          if (repo.fork || repo.private) return false;
          if (repo.name.toLowerCase() === username.toLowerCase()) return false;
          const portfolioNames = ['portfolio', 'portfolio_v', 'portfolio-main', 'my-portfolio'];
          if (portfolioNames.some(name => repo.name.toLowerCase().includes(name))) return false;
          if (repo.name.toLowerCase() === '42_cursus') return false;
          return true;
        });

        // Crear repos con imagen OG de GitHub (disponible inmediatamente, sin API extra)
        const basicRepos = filteredRepos.map(repo => ({
          name: repo.name,
          summary: repo.description || 'Sin descripción',
          url: repo.html_url,
          image: getGitHubOGImage(username, repo.name),
          stars: repo.stargazers_count,
          language: repo.language,
          updated_at: repo.updated_at,
          isGitHubRepo: true
        }));

        reposRef.current = [...basicRepos];
        if (!cancelled) {
          setRepos([...basicRepos]);
          setError(null);
          setLoading(false);
        }

        // Si quedan pocas peticiones, guardar caché y salir
        if (remaining !== null && parseInt(remaining) < 5) {
          console.warn(`GitHub API: quedan ${remaining} peticiones. Saltando READMEs.`);
          setCache(username, reposRef.current);
          return;
        }

        // Intentar obtener mejores imágenes de los READMEs en segundo plano
        if (cancelled) return;
        const topRepos = filteredRepos.slice(0, 15);
        
        const promises = topRepos.map(async (repo, index) => {
          try {
            const readme = await fetchReadme(username, repo.name);
            
            if (readme && !cancelled) {
              const image = extractImageFromMarkdown(readme, repo.html_url);
              const description = extractDescriptionFromMarkdown(readme);
              
              // Solo actualizar si encontramos una imagen real del README
              const hasNewData = image || description;
              if (hasNewData) {
                reposRef.current[index] = {
                  ...reposRef.current[index],
                  ...(description && { summary: description }),
                  ...(image && { image })
                };
                
                if (!cancelled) {
                  setRepos([...reposRef.current]);
                }
              }
            }
          } catch (err) {
            // Ignorar errores individuales - la imagen OG se mantiene
          }
        });
        
        await Promise.all(promises);
        
        if (!cancelled) {
          setCache(username, reposRef.current);
        }
      } catch (err) {
        console.error('Error fetching GitHub repos:', err);
        if (!cancelled) {
          if (!cached || cached.length === 0) {
            setError(err.message);
            setRepos([]);
          }
          setLoading(false);
        }
      }
    };

    fetchRepos();
    
    return () => {
      cancelled = true;
    };
  }, [username]);

  return { repos, loading, error };
};
