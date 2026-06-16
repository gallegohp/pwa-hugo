/**
 * ============================================
 * Aplicación: OMDb Movie Explorer
 * Palabra asignada: Mankind
 * ============================================
 * 
 * Features:
 * - Búsqueda por título
 * - Búsqueda por año
 * - Búsqueda por ID IMDb
 * - Vista de detalle mejorada
 * - Navegación entre 2 páginas
 * 
 * API: OMDb (omdbapi.com)
 */

// ============================================
// Constantes de configuración
// ============================================

const API_KEY = "6e67aaff";
const BASE_URL = "https://www.omdbapi.com/";
const PALABRA_ASIGNADA = "Mankind";

// Variable para guardar película actual (para la página de detalle)
let peliculaActual = null;

// ============================================
// Funciones de Navegación entre Páginas
// ============================================

/**
 * Muestra la página de búsqueda y oculta la de detalle
 */
function mostrarPaginaBusqueda() {
    document.getElementById('pagina-busqueda').classList.add('activa');
    document.getElementById('pagina-detalle').classList.remove('activa');
    document.getElementById('btn-detalle').style.display = 'none';
    
    // Actualizar botón activo en nav
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
    
    // Scroll al inicio
    window.scrollTo(0, 0);
}

/**
 * Muestra la página de detalle y oculta la de búsqueda
 */
function mostrarPaginaDetalle() {
    document.getElementById('pagina-busqueda').classList.remove('activa');
    document.getElementById('pagina-detalle').classList.add('activa');
    document.getElementById('btn-detalle').style.display = 'inline-block';
    
    // Scroll al inicio
    window.scrollTo(0, 0);
}

/**
 * Vuelve a la página de búsqueda desde detalle
 */
function volverABusqueda() {
    mostrarPaginaBusqueda();
}

// ============================================
// Funciones de Búsqueda
// ============================================

/**
 * Busca películas por década
 */
async function buscarPorDecada(decada) {
    const desde = decada;
    const hasta = decada + 9;

    try {
        mostrarCarga(`Cargando películas de "${PALABRA_ASIGNADA}" de los ${desde}s...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}&type=movie&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron películas de "${PALABRA_ASIGNADA}" en los ${desde}s.`);
            return;
        }

        // Filtrar películas por rango de décadas
        const peliculasFiltradas = data.Search.filter(pelicula => {
            const year = parseInt(pelicula.Year);
            return year >= desde && year <= hasta;
        });

        if (peliculasFiltradas.length === 0) {
            mostrarError(`No se encontraron películas de "${PALABRA_ASIGNADA}" en los ${desde}s.`);
            return;
        }

        mostrarResultados(peliculasFiltradas, `Películas de "${PALABRA_ASIGNADA}" - Década ${desde}s`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Busca todas las películas por la palabra asignada
 */
async function buscarTodas() {
    try {
        mostrarCarga(`Cargando todas las películas de "${PALABRA_ASIGNADA}"...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}&type=movie&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron películas de "${PALABRA_ASIGNADA}".`);
            return;
        }

        mostrarResultados(data.Search, `Todas las películas de "${PALABRA_ASIGNADA}"`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Busca películas por rango de clasificación (rating IMDb)
 */
async function buscarPorClasificacion(minRating, maxRating) {
    try {
        mostrarCarga(`Cargando películas de "${PALABRA_ASIGNADA}" con clasificación ${minRating} - ${maxRating}...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}&type=movie&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron películas de "${PALABRA_ASIGNADA}".`);
            return;
        }

        // Filtrar películas por rating - requiere fetch individual para cada película
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
            mostrarError(`No se encontraron películas con clasificación ${minRating} - ${maxRating}.`);
            return;
        }

        mostrarResultados(peliculasFiltradas, `Películas de "${PALABRA_ASIGNADA}" - Clasificación ${minRating} - ${maxRating}`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Busca películas por género
 */
async function buscarPorGenero(genero) {
    try {
        mostrarCarga(`Cargando películas de "${PALABRA_ASIGNADA}" en género ${genero}...`);

        const respuesta = await fetch(`${BASE_URL}?s=${PALABRA_ASIGNADA}&type=movie&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError(`No se encontraron películas de "${PALABRA_ASIGNADA}".`);
            return;
        }

        // Filtrar películas por género - requiere fetch individual para cada película
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
            mostrarError(`No se encontraron películas de género ${genero}.`);
            return;
        }

        mostrarResultados(peliculasFiltradas, `Películas de "${PALABRA_ASIGNADA}" - Género ${genero}`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Busca por ID IMDb (función auxiliar)
 */
async function buscarPorIDDirecto(imdbID) {
    try {
        mostrarCarga(`Buscando película con ID: ${imdbID}...`);

        const respuesta = await fetch(`${BASE_URL}?i=${imdbID}&apikey=${API_KEY}`);
        const data = await respuesta.json();

        if (!validarRespuesta(data)) {
            mostrarError('No se encontró una película con ese ID IMDb.');
            return;
        }

        // Guardar película actual y mostrar detalle
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
 * Valida que la respuesta de la API sea correcta
 */
function validarRespuesta(data) {
    if (data.Response === "False") {
        return false;
    }

    if (!data.Search && !data.Title) {
        return false;
    }

    return true;
}

/**
 * Valida que el póster esté disponible
 */
function validarPoster(poster) {
    if (!poster || poster === "N/A") {
        return "https://via.placeholder.com/300x450/e0e0e0/999999?text=Imagen+No+Disponible";
    }
    return poster;
}

/**
 * Obtiene el número de estrellas para la calificación
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
 * Muestra el mensaje de carga
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
 * Muestra un mensaje de error
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
 * Muestra una lista de películas en formato de tarjetas
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
 * Abre la página de detalle de una película
 */
async function abrirDetallePelicula(imdbID) {
    buscarPorIDDirecto(imdbID);
    mostrarPaginaDetalle();
}

/**
 * Muestra el detalle completo de una película
 */
function mostrarDetalle(pelicula) {
    const posterUrl = validarPoster(pelicula.Poster);
    const rating = pelicula.imdbRating || "N/A";
    const estrellas = obtenerEstrellas(rating);
    const tieneImagen = pelicula.Poster && pelicula.Poster !== "N/A";

    const html = `
        <div class="detalle-poster">
            ${tieneImagen ? 
                `<img src="${posterUrl}" alt="${pelicula.Title}" onerror="this.parentElement.innerHTML='<div class=\\'imagen-no-disponible-detalle\\'>Imagen no disponible</div>'">` :
                `<div class="imagen-no-disponible-detalle">Imagen no disponible</div>`
            }
        </div>
        <div class="detalle-info">
            <h2>${pelicula.Title}</h2>
            
            <div class="rating">
                <span class="stars">${estrellas}</span>
                <span>${rating}/10</span>
            </div>

            <p>
                <strong>Año:</strong>
                <em>${pelicula.Year || "No disponible"}</em>
            </p>

            <p>
                <strong>Género:</strong>
                <em>${pelicula.Genre || "No disponible"}</em>
            </p>

            <p>
                <strong>Director:</strong>
                <em>${pelicula.Director || "No disponible"}</em>
            </p>

            <p>
                <strong>Actores:</strong>
                <em>${pelicula.Actors || "No disponible"}</em>
            </p>

            <p>
                <strong>Duración:</strong>
                <em>${pelicula.Runtime || "No disponible"}</em>
            </p>

            <p>
                <strong>Tipo:</strong>
                <em>${pelicula.Type || "No disponible"}</em>
            </p>

            <p>
                <strong>País:</strong>
                <em>${pelicula.Country || "No disponible"}</em>
            </p>

            <div class="plot">
                <strong>Sinopsis:</strong>
                <em>${pelicula.Plot || "No disponible"}</em>
            </div>

            <p>
                <strong>ID IMDb:</strong>
                <em><a href="https://imdb.com/title/${pelicula.imdbID}" target="_blank" style="color: var(--color-acento);">${pelicula.imdbID}</a></em>
            </p>
        </div>
    `;

    const contenedor = document.getElementById("detalle-contenido");
    contenedor.innerHTML = html;
    contenedor.classList.add('detalle-contenido');
}