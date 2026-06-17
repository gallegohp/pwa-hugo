/**
 * Script Principal - Mankind OMDb Movie Explorer
 * Gestiona la obtención de datos desde la API de OMDb, la renderización de componentes de interfaz y el estado de la aplicación.
 * Implementa Filtrado Múltiple Acumulativo.
 */

const API_KEY = "6e67aaff";
const BASE_URL = "https://www.omdbapi.com/";
const PALABRA_ASIGNADA = "Mankind";

let peliculaActual = null;

/**
 * Estado global que almacena todos los filtros activos simultáneamente.
 */
let estadoFiltros = {
    tipo: "",       // "movie" o "series"
    decada: null,   // ej. 1980
    minRating: null, // ej. 8
    maxRating: null, // ej. 10
    genero: ""      // ej. "Action"
};

// ============================================
// Funciones de Navegación entre Páginas
// ============================================

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

// ============================================
// Lógica de Filtro Múltiple
// ============================================

/**
 * Función central que obtiene los datos base y aplica secuencialmente todos los filtros activos.
 */
async function aplicarFiltrosCombinados() {
    // 1. Mostrar mensaje de carga genérico
    mostrarCarga(`Aplicando filtros y buscando resultados para "${PALABRA_ASIGNADA}"...`);

    // Construimos los parámetros de la API para el tipo si está definido
    const tipoParam = estadoFiltros.tipo ? `&type=${estadoFiltros.tipo}` : "";

    try {
        // 2. Obtener resultados base de la API (por palabra clave y tipo)
        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}${tipoParam}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarErrorCombinado();
            return;
        }

        let peliculasFiltradas = data.Search;

        // 3. Filtrar por Década (Filtro Local Rápido)
        if (estadoFiltros.decada) {
            const desde = estadoFiltros.decada;
            const hasta = estadoFiltros.decada + 9;
            peliculasFiltradas = peliculasFiltradas.filter(pelicula => {
                const year = parseInt(pelicula.Year);
                return year >= desde && year <= hasta;
            });
        }

        // Si después de la década no hay nada, detenernos
        if (peliculasFiltradas.length === 0) {
            mostrarErrorCombinado();
            return;
        }

        // 4. Si hay filtros de Rating o Género, necesitamos detalles individuales de cada película resultante
        if (estadoFiltros.minRating !== null || estadoFiltros.genero !== "") {
            mostrarCarga(`Obteniendo detalles adicionales para aplicar filtros avanzados...`);
            
            const peliculasConDetalle = await Promise.all(
                peliculasFiltradas.map(async (pelicula) => {
                    try {
                        const respuestaDetalle = await fetch(`${BASE_URL}?i=${pelicula.imdbID}&apikey=${API_KEY}`);
                        return await respuestaDetalle.json();
                    } catch (e) {
                        return null;
                    }
                })
            );

            // Filtrar por Rating
            if (estadoFiltros.minRating !== null) {
                peliculasFiltradas = peliculasConDetalle.filter(pelicula => {
                    if (!pelicula || pelicula.Response === "False") return false;
                    const rating = parseFloat(pelicula.imdbRating);
                    return !isNaN(rating) && rating >= estadoFiltros.minRating && rating <= estadoFiltros.maxRating;
                });
            } else {
                // Si solo había género pero no rating, usar los detalles igual
                peliculasFiltradas = peliculasConDetalle.filter(p => p && p.Response !== "False");
            }

            // Filtrar por Género
            if (estadoFiltros.genero !== "") {
                peliculasFiltradas = peliculasFiltradas.filter(pelicula => {
                    const generos = pelicula.Genre ? pelicula.Genre.split(',').map(g => g.trim().toLowerCase()) : [];
                    return generos.includes(estadoFiltros.genero.toLowerCase());
                });
            }
        }

        // 5. Verificar si quedaron resultados tras todos los filtros
        if (peliculasFiltradas.length === 0) {
            mostrarErrorCombinado();
            return;
        }

        // 6. Generar título dinámico según los filtros activos
        let titulo = "Resultados";
        if (estadoFiltros.tipo === "movie") titulo += " de Películas";
        else if (estadoFiltros.tipo === "series") titulo += " de Series";
        else titulo += " Generales";

        if (estadoFiltros.decada) titulo += ` (${estadoFiltros.decada}s)`;
        if (estadoFiltros.genero) titulo += ` • ${estadoFiltros.genero}`;
        if (estadoFiltros.minRating !== null) titulo += ` • ⭐ ${estadoFiltros.minRating}-${estadoFiltros.maxRating}`;

        mostrarResultados(peliculasFiltradas, titulo);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Genera un mensaje de error amigable indicando la combinación que falló.
 */
function mostrarErrorCombinado() {
    let mensaje = `No se encontraron resultados para "${PALABRA_ASIGNADA}" con los filtros actuales:<br><br>`;
    
    if (estadoFiltros.tipo) mensaje += `<b>Tipo:</b> ${estadoFiltros.tipo === "movie" ? "Película" : "Serie"}<br>`;
    if (estadoFiltros.decada) mensaje += `<b>Década:</b> ${estadoFiltros.decada}s<br>`;
    if (estadoFiltros.genero) mensaje += `<b>Género:</b> ${estadoFiltros.genero}<br>`;
    if (estadoFiltros.minRating !== null) mensaje += `<b>Rating:</b> ${estadoFiltros.minRating} - ${estadoFiltros.maxRating}<br>`;
    
    if (mensaje.endsWith('<br><br>')) {
        mensaje = `No se encontraron resultados en general para "${PALABRA_ASIGNADA}".`;
    }

    mostrarError(mensaje);
}

// ============================================
// Funciones Actualizadoras de Estado (Setters)
// ============================================

/**
 * Limpia todos los filtros y vuelve a realizar la búsqueda principal.
 */
async function limpiarFiltrosYBuscar() {
    estadoFiltros = {
        tipo: "",
        decada: null,
        minRating: null,
        maxRating: null,
        genero: ""
    };
    await aplicarFiltrosCombinados();
}

/**
 * Actualiza el tipo en el estado global y dispara la búsqueda.
 */
async function setFiltroTipo(tipo) {
    estadoFiltros.tipo = tipo;
    await aplicarFiltrosCombinados();
}

/**
 * Actualiza la década en el estado global y dispara la búsqueda.
 */
async function setFiltroDecada(decada) {
    estadoFiltros.decada = decada;
    await aplicarFiltrosCombinados();
}

/**
 * Actualiza el rating en el estado global y dispara la búsqueda.
 */
async function setFiltroClasificacion(min, max) {
    estadoFiltros.minRating = min;
    estadoFiltros.maxRating = max;
    await aplicarFiltrosCombinados();
}

/**
 * Actualiza el género en el estado global y dispara la búsqueda.
 */
async function setFiltroGenero(genero) {
    estadoFiltros.genero = genero;
    await aplicarFiltrosCombinados();
}

/**
 * Obtiene los datos detallados utilizando un ID directo de IMDb y despliega la vista de detalle.
 * @param {string} imdbID - El identificador único en IMDb.
 */
async function buscarPorIDDirecto(imdbID) {
    try {
        mostrarCarga(`Buscando detalle de ID: ${imdbID}...`);

        const respuesta = await fetch(`${BASE_URL}?i=${imdbID}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError('No se encontró información con ese ID en IMDb.');
            return;
        }

        peliculaActual = data;
        mostrarDetalle(data);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

// ============================================
// Funciones de Validación
// ============================================

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

// ============================================
// Funciones de Presentación
// ============================================

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
                        `<div class="imagen-no-disponible"></div>`
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

// ============================================
// Inicialización y Eventos Globales
// ============================================

/**
 * Inicia la configuración y carga inicial una vez que el árbol DOM está completamente formado.
 */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    aplicarFiltrosCombinados(); // Usamos la nueva función central

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