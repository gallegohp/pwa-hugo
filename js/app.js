/**
 * Script Principal - Mankind OMDb Movie Explorer
 * Gestiona la obtención de datos desde la API de OMDb, la renderización de componentes de interfaz y el estado de la aplicación.
 */

const API_KEY = "6e67aaff";
const BASE_URL = "https://www.omdbapi.com/";
const PALABRA_ASIGNADA = "Mankind";

let peliculaActual = null;
let tipoActual = "";

/**
 * Transiciona la vista actual hacia la página principal de búsqueda.
 */
function mostrarPaginaBusqueda() {
    document.getElementById('pagina-busqueda').classList.add('activa');
    document.getElementById('pagina-detalle').classList.remove('activa');
    window.scrollTo(0, 0);
}

/**
 * Transiciona la vista actual hacia la página de detalle de la película o serie.
 */
function mostrarPaginaDetalle() {
    document.getElementById('pagina-busqueda').classList.remove('activa');
    document.getElementById('pagina-detalle').classList.add('activa');
    window.scrollTo(0, 0);
}

/**
 * Navega de regreso a la vista de búsqueda desde la vista de detalle.
 */
function volverABusqueda() {
    mostrarPaginaBusqueda();
}

/**
 * Obtiene y muestra las películas o series estrenadas dentro de una década específica.
 * @param {number} decada - El año de inicio de la década (por ejemplo, 1980).
 */
async function buscarPorDecada(decada) {
    const desde = decada;
    const hasta = decada + 9;
    const tipoParam = tipoActual ? `&type=${tipoActual}` : "";
    const tipoLabel = tipoActual === "series" ? "series" : "películas";

    try {
        mostrarCarga(`Cargando ${tipoLabel} de "${PALABRA_ASIGNADA}" de los ${desde}s...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}${tipoParam}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron ${tipoLabel} de "${PALABRA_ASIGNADA}" en los ${desde}s.`);
            return;
        }

        const peliculasFiltradas = data.Search.filter(pelicula => {
            const year = parseInt(pelicula.Year);
            return year >= desde && year <= hasta;
        });

        if (peliculasFiltradas.length === 0) {
            mostrarError(`No se encontraron ${tipoLabel} de "${PALABRA_ASIGNADA}" en los ${desde}s.`);
            return;
        }

        mostrarResultados(peliculasFiltradas, `${tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1)} de "${PALABRA_ASIGNADA}" - Década ${desde}s`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Obtiene y muestra todas las películas o series que coinciden con la palabra asignada.
 */
async function buscarTodas() {
    const tipoParam = tipoActual ? `&type=${tipoActual}` : "";
    const tipoLabel = tipoActual === "series" ? "series" : tipoActual === "movie" ? "películas" : "resultados";

    try {
        mostrarCarga(`Cargando todos los ${tipoLabel} de "${PALABRA_ASIGNADA}"...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}${tipoParam}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron ${tipoLabel} de "${PALABRA_ASIGNADA}".`);
            return;
        }

        const titulo = tipoActual === "series" 
            ? `Todas las series de "${PALABRA_ASIGNADA}"` 
            : tipoActual === "movie" 
                ? `Todas las películas de "${PALABRA_ASIGNADA}"`
                : `Todos los resultados de "${PALABRA_ASIGNADA}"`;

        mostrarResultados(data.Search, titulo);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Actualiza el tipo de búsqueda (película o serie) y activa una nueva consulta global.
 * @param {string} tipo - El tipo de contenido a buscar ("movie" o "series").
 */
async function buscarPorTipo(tipo) {
    tipoActual = tipo;
    await buscarTodas();
}

/**
 * Obtiene y filtra resultados basándose en su calificación dentro de IMDb.
 * @param {number} minRating - La calificación mínima permitida.
 * @param {number} maxRating - La calificación máxima permitida.
 */
async function buscarPorClasificacion(minRating, maxRating) {
    const tipoParam = tipoActual ? `&type=${tipoActual}` : "";
    const tipoLabel = tipoActual === "series" ? "series" : "películas";

    try {
        mostrarCarga(`Cargando ${tipoLabel} de "${PALABRA_ASIGNADA}" con calificación ${minRating} - ${maxRating}...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}${tipoParam}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron ${tipoLabel} de "${PALABRA_ASIGNADA}".`);
            return;
        }

        const peliculasConRating = await Promise.all(
            data.Search.map(async (pelicula) => {
                try {
                    const respuestaDetalle = await fetch(`${BASE_URL}?i=${pelicula.imdbID}&apikey=${API_KEY}`);
                    const detalle = await respuestaDetalle.json();
                    return detalle;
                } catch (e) {
                    return null;
                }
            })
        );

        const peliculasFiltradas = peliculasConRating.filter(pelicula => {
            if (!pelicula || pelicula.Response === "False") return false;
            const rating = parseFloat(pelicula.imdbRating);
            return !isNaN(rating) && rating >= minRating && rating <= maxRating;
        });

        if (peliculasFiltradas.length === 0) {
            mostrarError(`No se encontraron ${tipoLabel} con calificación ${minRating} - ${maxRating}.`);
            return;
        }

        const tipoTitulo = tipoActual === "series" ? "Series" : "Películas";
        mostrarResultados(peliculasFiltradas, `${tipoTitulo} de "${PALABRA_ASIGNADA}" - Clasificación ${minRating} - ${maxRating}`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Obtiene y filtra resultados basándose en un género específico.
 * @param {string} genero - El género a utilizar como filtro.
 */
async function buscarPorGenero(genero) {
    const tipoParam = tipoActual ? `&type=${tipoActual}` : "";
    const tipoLabel = tipoActual === "series" ? "series" : "películas";

    try {
        mostrarCarga(`Cargando ${tipoLabel} de "${PALABRA_ASIGNADA}" en género ${genero}...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}${tipoParam}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron ${tipoLabel} de "${PALABRA_ASIGNADA}".`);
            return;
        }

        const peliculasConGenero = await Promise.all(
            data.Search.map(async (pelicula) => {
                try {
                    const respuestaDetalle = await fetch(`${BASE_URL}?i=${pelicula.imdbID}&apikey=${API_KEY}`);
                    const detalle = await respuestaDetalle.json();
                    return detalle;
                } catch (e) {
                    return null;
                }
            })
        );

        const peliculasFiltradas = peliculasConGenero.filter(pelicula => {
            if (!pelicula || pelicula.Response === "False") return false;
            const generos = pelicula.Genre ? pelicula.Genre.split(',').map(g => g.trim()) : [];
            return generos.some(g => g.toLowerCase() === genero.toLowerCase());
        });

        if (peliculasFiltradas.length === 0) {
            mostrarError(`No se encontraron ${tipoLabel} de género ${genero}.`);
            return;
        }

        const tipoTitulo = tipoActual === "series" ? "Series" : "Películas";
        mostrarResultados(peliculasFiltradas, `${tipoTitulo} de "${PALABRA_ASIGNADA}" - Género ${genero}`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Obtiene los datos detallados utilizando un ID directo de IMDb y despliega la vista de detalle.
 * @param {string} imdbID - El identificador único en IMDb.
 */
async function buscarPorIDDirecto(imdbID) {
    try {
        mostrarCarga(`Buscando película con ID: ${imdbID}...`);

        const respuesta = await fetch(`${BASE_URL}?i=${imdbID}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError('No se encontró una película con ese ID en IMDb.');
            return;
        }

        peliculaActual = data;
        mostrarDetalle(data);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Valida el formato de la respuesta entregada por la API.
 * @param {Object} data - El objeto con los datos crudos retornados por la API.
 * @returns {boolean} Verdadero si la respuesta es válida y contiene datos, falso en caso contrario.
 */
function validarRespuesta(data) {
    if (data.Response === "False") return false;
    if (!data.Search && !data.Title) return false;
    return true;
}

/**
 * Valida la URL de un póster y devuelve una imagen alternativa en caso de no estar disponible.
 * @param {string} poster - La URL del póster a validar.
 * @returns {string} Una URL válida hacia una imagen.
 */
function validarPoster(poster) {
    if (!poster || poster === "N/A") {
        return "https://via.placeholder.com/300x450/e0e0e0/999999?text=Imagen+No+Disponible";
    }
    return poster;
}

/**
 * Genera una representación gráfica de estrellas basada en la calificación numérica.
 * @param {string} rating - La calificación de IMDb como cadena de texto.
 * @returns {string} Una cadena de texto conteniendo las estrellas representativas.
 */
function obtenerEstrellas(rating) {
    if (!rating || rating === "N/A") return "- - - - -";
    const puntuacion = Math.round(parseFloat(rating) / 2);
    const llenas = "●".repeat(puntuacion);
    const vacias = "○".repeat(5 - puntuacion);
    return llenas + " " + vacias;
}

/**
 * Renderiza un indicador visual de carga junto a un mensaje en el contenedor principal.
 * @param {string} mensaje - El texto informativo de carga a mostrar.
 */
function mostrarCarga(mensaje) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = `
        <div class="carga">
            <div class="spinner"></div>
            <p>${mensaje}</p>
        </div>
    `;
}

/**
 * Renderiza un mensaje de error en el contenedor de resultados principal.
 * @param {string} mensaje - El mensaje de error a mostrar.
 */
function mostrarError(mensaje) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = `
        <div class="error">
            <p>${mensaje}</p>
        </div>
    `;
}

/**
 * Renderiza los resultados de búsqueda como una cuadrícula de tarjetas de contenido.
 * @param {Array} peliculas - El arreglo de objetos que representan las películas obtenidas.
 * @param {string} titulo - El título descriptivo para la sección actual de resultados.
 */
function mostrarResultados(peliculas, titulo) {
    const contenedor = document.getElementById("resultados");

    let html = `<h2 class="titulo-seccion">${titulo}</h2>`;
    html += `<div class="tarjetas">`;

    peliculas.forEach(pelicula => {
        const posterUrl = validarPoster(pelicula.Poster);
        const año = pelicula.Year || "N/A";
        const tieneImagen = pelicula.Poster && pelicula.Poster !== "N/A";

        html += `
            <div class="tarjeta" onclick="abrirDetallePelicula('${pelicula.imdbID}')">
                <div class="tarjeta-imagen">
                    ${tieneImagen ? 
                        `<img src="${posterUrl}" alt="${pelicula.Title}" onerror="this.parentElement.innerHTML='<div class=\\'imagen-no-disponible\\'>Imagen no disponible</div>'">` :
                        `<div class="imagen-no-disponible">Imagen no disponible</div>`
                    }
                </div>
                <div class="info">
                    <h3>${pelicula.Title}</h3>
                    <p><strong>Año:</strong> ${año}</p>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    contenedor.innerHTML = html;
}

/**
 * Maneja el evento de selección para abrir la vista detallada de una película específica.
 * @param {string} imdbID - El identificador IMDb necesario para realizar la consulta.
 */
async function abrirDetallePelicula(imdbID) {
    buscarPorIDDirecto(imdbID);
    mostrarPaginaDetalle();
}

/**
 * Renderiza la vista en detalle para una sola película o serie.
 * @param {Object} pelicula - El objeto detallado proporcionado por la API.
 */
function mostrarDetalle(pelicula) {
    const posterUrl = validarPoster(pelicula.Poster);
    const rating = pelicula.imdbRating || "N/A";
    const estrellas = obtenerEstrellas(rating);
    const tieneImagen = pelicula.Poster && pelicula.Poster !== "N/A";

    const html = `
        <div class="detalle-poster">
            ${tieneImagen
                ? `<img src="${posterUrl}" alt="${pelicula.Title}" onerror="this.parentElement.innerHTML='<div class=\'imagen-no-disponible-detalle\'></div>'">`
                : `<div class="imagen-no-disponible-detalle"></div>`
            }
        </div>
        <div class="detalle-info">
            <h2>${pelicula.Title}</h2>

            <div class="rating">
                <span class="stars">${estrellas}</span>
                <span>${rating} / 10 &nbsp;IMDb</span>
            </div>

            <div class="detalle-meta">
                <div class="meta-row"><strong>A&ntilde;o</strong>      <em>${pelicula.Year || "N/A"}</em></div>
                <div class="meta-row"><strong>Género</strong>    <em>${pelicula.Genre || "N/A"}</em></div>
                <div class="meta-row"><strong>Director</strong>  <em>${pelicula.Director || "N/A"}</em></div>
                <div class="meta-row"><strong>Actores</strong>   <em>${pelicula.Actors || "N/A"}</em></div>
                <div class="meta-row"><strong>Duración</strong> <em>${pelicula.Runtime || "N/A"}</em></div>
                <div class="meta-row"><strong>País</strong>      <em>${pelicula.Country || "N/A"}</em></div>
            </div>

            ${pelicula.Plot && pelicula.Plot !== "N/A"
                ? `<p class="plot">${pelicula.Plot}</p>`
                : ''
            }

            <a href="https://imdb.com/title/${pelicula.imdbID}" target="_blank" rel="noopener" class="imdb-link">
                Ver en IMDb &rarr;
            </a>
        </div>
    `;

    const contenedor = document.getElementById("detalle-contenido");
    contenedor.innerHTML = html;
}

/**
 * Inicia la configuración y carga inicial una vez que el árbol DOM está completamente formado.
 */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    buscarTodas();

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
});

// ============================================
// Lógica de Tema (Modo Claro / Oscuro)
// ============================================

/**
 * Inicializa el tema basándose en localStorage o en la preferencia del sistema.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('mankind-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcons('dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeIcons('light');
    }
}

/**
 * Alterna entre el modo claro y el modo oscuro.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('mankind-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('mankind-theme', 'light');
    }
    
    updateThemeIcons(newTheme);
}

/**
 * Actualiza los íconos del botón de tema para mostrar el sol o la luna.
 * @param {string} theme - El tema actual ('light' o 'dark').
 */
function updateThemeIcons(theme) {
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    
    if (!iconSun || !iconMoon) return;
    
    if (theme === 'dark') {
        iconSun.style.display = 'block';
        iconMoon.style.display = 'none';
    } else {
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block';
    }
}