/**
 * Mankind OMDb Movie Explorer Main Script
 * Handles fetching data from the OMDb API, rendering UI components, and state management.
 */

const API_KEY = "6e67aaff";
const BASE_URL = "https://www.omdbapi.com/";
const PALABRA_ASIGNADA = "Mankind";

let peliculaActual = null;
let tipoActual = "";

/**
 * Transitions the view to the search page.
 */
function mostrarPaginaBusqueda() {
    document.getElementById('pagina-busqueda').classList.add('activa');
    document.getElementById('pagina-detalle').classList.remove('activa');
    window.scrollTo(0, 0);
}

/**
 * Transitions the view to the detail page.
 */
function mostrarPaginaDetalle() {
    document.getElementById('pagina-busqueda').classList.remove('activa');
    document.getElementById('pagina-detalle').classList.add('activa');
    window.scrollTo(0, 0);
}

/**
 * Navigates back to the search page from the detail view.
 */
function volverABusqueda() {
    mostrarPaginaBusqueda();
}

/**
 * Fetches and displays movies released within a specific decade.
 * @param {number} decada - The starting year of the decade (e.g., 1980).
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
 * Fetches and displays all movies or series matching the assigned keyword.
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
 * Updates the search type and triggers a global search.
 * @param {string} tipo - The type of content to search for ("movie" or "series").
 */
async function buscarPorTipo(tipo) {
    tipoActual = tipo;
    await buscarTodas();
}

/**
 * Fetches and filters movies based on their IMDb rating.
 * @param {number} minRating - The minimum IMDb rating.
 * @param {number} maxRating - The maximum IMDb rating.
 */
async function buscarPorClasificacion(minRating, maxRating) {
    const tipoParam = tipoActual ? `&type=${tipoActual}` : "";
    const tipoLabel = tipoActual === "series" ? "series" : "películas";

    try {
        mostrarCarga(`Cargando ${tipoLabel} de "${PALABRA_ASIGNADA}" con clasificación ${minRating} - ${maxRating}...`);

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
            mostrarError(`No se encontraron ${tipoLabel} con clasificación ${minRating} - ${maxRating}.`);
            return;
        }

        const tipoTitulo = tipoActual === "series" ? "Series" : "Películas";
        mostrarResultados(peliculasFiltradas, `${tipoTitulo} de "${PALABRA_ASIGNADA}" - Clasificación ${minRating} - ${maxRating}`);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Fetches and filters movies based on a specific genre.
 * @param {string} genero - The genre to filter by.
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
 * Fetches detail data for a specific IMDb ID and displays the detail view.
 * @param {string} imdbID - The IMDb ID of the movie or series.
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

        peliculaActual = data;
        mostrarDetalle(data);

    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}

/**
 * Validates the API response format.
 * @param {Object} data - The raw API response payload.
 * @returns {boolean} True if the response is valid, otherwise false.
 */
function validarRespuesta(data) {
    if (data.Response === "False") return false;
    if (!data.Search && !data.Title) return false;
    return true;
}

/**
 * Validates a poster URL, returning a fallback image if unavailable.
 * @param {string} poster - The poster URL to validate.
 * @returns {string} A valid image URL.
 */
function validarPoster(poster) {
    if (!poster || poster === "N/A") {
        return "https://via.placeholder.com/300x450/e0e0e0/999999?text=Imagen+No+Disponible";
    }
    return poster;
}

/**
 * Generates a textual representation of a star rating.
 * @param {string} rating - The IMDb rating as a string.
 * @returns {string} The star representation string.
 */
function obtenerEstrellas(rating) {
    if (!rating || rating === "N/A") return "- - - - -";
    const puntuacion = Math.round(parseFloat(rating) / 2);
    const llenas = "●".repeat(puntuacion);
    const vacias = "○".repeat(5 - puntuacion);
    return llenas + " " + vacias;
}

/**
 * Renders a loading spinner and message in the results container.
 * @param {string} mensaje - The loading message to display.
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
 * Renders an error message in the results container.
 * @param {string} mensaje - The error message to display.
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
 * Renders the search results as a grid of movie cards.
 * @param {Array} peliculas - The array of movie objects to render.
 * @param {string} titulo - The title for the results section.
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
 * Handles the click event for opening the detail view of a movie.
 * @param {string} imdbID - The IMDb ID to fetch details for.
 */
async function abrirDetallePelicula(imdbID) {
    buscarPorIDDirecto(imdbID);
    mostrarPaginaDetalle();
}

/**
 * Renders the detailed view of a single movie.
 * @param {Object} pelicula - The movie detail payload from the API.
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
                🔗 Ver en IMDb &rarr;
            </a>
        </div>
    `;

    const contenedor = document.getElementById("detalle-contenido");
    contenedor.innerHTML = html;
}

/**
 * Triggers initial setup on DOM load.
 */
document.addEventListener('DOMContentLoaded', () => {
    buscarTodas();
});