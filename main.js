// 2. DEFINIENDO EL TAMAÑO DE LA TEXTURA (Rect2)
// A diferencia de un Sprite2D en Godot que detecta el tamaño de la imagen automáticamente,
// aquí debemos definir la "caja de colisión" o los límites (bounds) de nuestro mundo.
// ATENCIÓN: Reemplaza 1080 y 1920 con el alto y ancho REAL de tu mapa.png en píxeles.
const alto = 2372;
const ancho = 1760;

// En Leaflet, las coordenadas se escriben [Y, X] en lugar de (X, Y).
// Esto define un rectángulo desde la esquina inferior izquierda [0,0] hasta la superior derecha [alto, ancho].
const limites = [[0, 0], [alto, ancho]];

// 1. INICIALIZANDO EL VIEWPORT Y LA CAMERA2D
// L.map() busca el ID del nodo en el DOM (el div) y lo convierte en nuestro mundo interactivo.
// L.CRS.Simple es crucial: le dice al mapa que use un sistema de coordenadas cartesiano plano (X, Y) 
// en lugar de un globo terráqueo.


const mapa = L.map('mapa-contenedor', {
    crs: L.CRS.Simple,
    minZoom: -1, // Qué tanto podemos alejar la cámara (zoom out)
    maxZoom: 2,   // Qué tanto podemos acercar la cámara (zoom in)

    // NUEVO: Límites de la Camera2D
    maxBounds: limites, 
    // NUEVO: Colisión sólida al 100% (sin efecto de banda elástica)
    maxBoundsViscosity: 1.0

});



// 3. INSTANCIANDO EL SPRITE2D
// L.imageOverlay carga tu .png y lo estira para que encaje exactamente en los 'limites' que definimos.
const mapaSprite = L.imageOverlay('mapa.png', limites);


// 4. AÑADIENDO EL NODO AL ÁRBOL Y AJUSTANDO LA CÁMARA
// Agregamos el sprite a nuestro mapa.
mapaSprite.addTo(mapa);

// 4.5 GRUPOS DE CAPAS (Tus Node2D contenedores)
const gruposFiltros = {
    "feria": L.layerGroup().addTo(mapa),
    "charla": L.layerGroup().addTo(mapa)
};

// 4.8 RECURSO DE TEXTURA PERSONALIZADA (Tu Texture2D)
const iconoPixelArt = L.icon({
    // La ruta a tu archivo exportado
    iconUrl: 'marcador-custom.png',
    
    // El tamaño (rect_size) [Ancho, Alto] en píxeles de tu imagen
    iconSize: [38, 59], 
    
    // El "Offset" o punto de origen [X, Y]. 
    // Si tu pin mide 32x32 y quieres que la "punta" inferior central toque el mapa, sería [16, 32].
    iconAnchor: [19, 59], 
    
    // Dónde se instanciará el menú emergente (Pop-up) relativo al iconAnchor.
    // Un valor negativo en Y empuja la caja de texto hacia arriba para que no tape tu pixel art.
    popupAnchor: [0, -32] 
});

// Le decimos a la cámara que haga un "zoom extents", ajustando su nivel de zoom 
// automáticamente para que toda la imagen (los limites) sea visible al cargar la página.
mapa.fitBounds(limites);

// 5. INSTANCIANDO UN MARCADOR (Tu Area2D/Marker2D)
// Leaflet usa el formato [Y, X]. Pon valores de prueba menores al alto y ancho de tu mapa.
//let marcadorPrueba = L.marker([344, 182]); 

// add_child(marcador)
//marcadorPrueba.addTo(mapa);

// Le añadimos un menú contextual (como instanciar un Panel de UI al hacer clic)
//marcadorPrueba.bindPopup("<b>¡Hola Paraná!</b><br>Aquí habrá un evento.");

// 6. HERRAMIENTA DE DEBUG: OBTENER COORDENADAS AL HACER CLIC
// .on() es el método de Leaflet para conectar una señal (Signal) a un evento.
mapa.on('click', function(evento) {
    // evento.latlng contiene el Vector2 [Y, X] exacto donde impactó el clic.
    console.log("Coordenadas para el JSON: ", evento.latlng);
});

// Definimos una función asíncrona (Corrutina)
async function instanciarEventosDiarios() {
    try {
        // 1. Cargamos el archivo (Como un HTTPRequest o FileAccess)
        const respuesta = await fetch('eventos.json');
        
        // 2. Parseamos el texto a un Array de Diccionarios 
        // (Equivalente a JSON.parse_string() en Godot)
        const listaEventos = await respuesta.json();

        // 3. Obtenemos la fecha de la computadora del usuario
        const hoy = new Date();
        // Formateamos la fecha a "YYYY-MM-DD" para que coincida con el JSON
        const anio = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Añade un 0 si el mes es < 10
        const dia = String(hoy.getDate()).padStart(2, '0');
        const fechaActual = `${anio}-${mes}-${dia}`;
        
        console.log("Fecha detectada:", fechaActual);

        // 4. Bucle for para recorrer el Array (for evento in listaEventos:)
        for (let evento of listaEventos) {
            
            // Condición: Si la fecha del evento es igual a hoy, instanciamos el nodo
            if (evento.fecha === fechaActual) {
                
                // Instanciamos el marcador usando las coordenadas del Diccionario
                // Instanciamos el marcador pasándole nuestra textura personalizada
                let marcador = L.marker(evento.coordenadas, { icon: iconoPixelArt });
                
                
                // NUEVO: add_child() al grupo correspondiente, no al mapa general
                let grupoCorrespondiente = gruposFiltros[evento.categoria];
                if (grupoCorrespondiente) {
                    marcador.addTo(grupoCorrespondiente);
                }
                
                // Armamos el texto del Pop-up...
                
                // Armamos el texto del Pop-up concatenando datos (Uso de HTML básico para dar formato)
                let textoPopup = `<b>${evento.nombre}</b><br>${evento.descripcion}`;
                marcador.bindPopup(textoPopup);
            }
        }
    } catch (error) {
        // Esto captura cualquier error (ej. si escribiste mal el nombre del .json)
        console.error("Error cargando los recursos: ", error);
    }
}

// 7. CONECTANDO SEÑALES DE LA INTERFAZ
// Buscamos los nodos CheckBox por su ID (como hacer un get_node("$CanvasLayer/CheckFeria"))
const checkFeria = document.getElementById('check-feria');
const checkCharla = document.getElementById('check-charla');

// Conectamos la señal 'change' para las ferias
checkFeria.addEventListener('change', function(evento) {
    // evento.target.checked devuelve true o false
    if (evento.target.checked) {
        mapa.addLayer(gruposFiltros["feria"]); // show()
    } else {
        mapa.removeLayer(gruposFiltros["feria"]); // hide()
    }
});

// Conectamos la señal 'change' para las charlas
checkCharla.addEventListener('change', function(evento) {
    if (evento.target.checked) {
        mapa.addLayer(gruposFiltros["charla"]);
    } else {
        mapa.removeLayer(gruposFiltros["charla"]);
    }
});

// Llamamos a la función para que se ejecute al iniciar el script (como si fuera el _ready())
instanciarEventosDiarios();

