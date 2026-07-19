// ============================================================
// VocalCoach - Entrenador de Canto
// ============================================================

const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4 = 440;
const A4_MIDI = 69;

let audioCtx = null, analyser = null, microphone = null, isListening = false, animFrameId = null;

// ============================================================
// NOTE UTILITIES
// ============================================================
function midiToFreq(m) { return A4 * Math.pow(2, (m - A4_MIDI) / 12); }
function freqToMidi(f) { return Math.round(A4_MIDI + 12 * Math.log2(f / A4)); }
function midiToNote(m) {
    const ni = ((m % 12) + 12) % 12;
    return { name: NOTE_NAMES[ni], octave: Math.floor(m / 12) - 1, en: NOTE_NAMES_EN[ni] };
}
function centsOffPitch(f, tf) { return (f > 0 && tf > 0) ? Math.round(1200 * Math.log2(f / tf)) : 0; }

// ============================================================
// GENERIC EXERCISES (screen-exercises)
// ============================================================
const EXERCISES = {
    'pentatonic': { name: 'Escala Pentatónica', desc: '5 notas - Ideal para principiantes', notes: [60,62,64,67,69,72,69,67,64,62,60], noteDuration: 1500 },
    'major-scale': { name: 'Escala Mayor Completa', desc: '8 notas - Ejercicio clásico', notes: [60,62,64,65,67,69,71,72,71,69,67,65,64,62,60], noteDuration: 1300 },
    'arpegio': { name: 'Arpegio Mayor', desc: 'Do-Mi-Sol-Do - Saltos de intervalo', notes: [60,64,67,72,67,64,60], noteDuration: 1600 },
    'octave-jump': { name: 'Salto de Octava', desc: 'Amplía tu rango vocal', notes: [48,60,72,60,48], noteDuration: 2000 },
    'half-step': { name: 'Semitono Ascendente', desc: 'Precisión de afinación', notes: [60,61,62,63,64,65,66,67,68,69,70,71,72], noteDuration: 1200 },
    'breathing': { name: 'Control Respiratorio', desc: 'Respiración diafragmática', notes: [60,60,60,60], noteDuration: 4000 }
};

// ============================================================
// STYLE LESSONS DATABASE
// ============================================================
const STYLE_DATA = {
    hiphop: {
        icon: '🎤', name: 'Hip Hop', color: '#537ecf',
        desc: 'Domina el flow, la cadencia y el delivery lírico del Hip Hop.',
        lessons: [
            { title: 'Flow Básico', desc: 'Aprende a mantener un ritmo constante al rapear sobre un beat de 90 BPM.', tip: 'Lee una frase en voz alta con un metrónomo. Mantén cada sílaba alineada con el golpe del beat.', notes: [60,60,62,62,64,64,67,67], duration: 800, technique: 'Mantén el pulso firme. Las sílabas fuertes caen en el golpe.' },
            { title: 'Cadencia Do-Sol', desc: 'Practica subir y bajar tu entonación rapeando patrones de notas.', tip: 'Imagina que cada palabra es un instrumento. Sube el tono en las palabras clave.', notes: [60,62,64,67,67,64,62,60], duration: 900, technique: 'La cadencia sube para énfasis y baja para resolución.' },
            { title: 'Doble Tempo', desc: 'Rapea el doble de rápido manteniendo claridad en cada palabra.', tip: 'Empieza lento y aumenta gradualmente la velocidad. La articulación es clave.', notes: [60,64,67,72,72,67,64,60], duration: 600, technique: 'Las consonantes deben ser nítidas incluso a mayor velocidad.' },
            { title: 'Tono Agresivo', desc: 'Desarrolla un delivery con energía y presión vocal controlada.', tip: 'No fuerces la garganta. La potencia viene del diafragma, no de la garganta.', notes: [55,55,60,60,67,67,72,72], duration: 1000, technique: 'Siente la vibración en el pecho para los tonos graves.' },
            { title: 'Freestyle', desc: 'Improvisa sobre una progresión de notas. Combina todo lo aprendido.', tip: 'No busques la perfección, busca la expresión. El flow se siente, no se piensa.', notes: [60,62,64,62,67,64,60,55], duration: 1100, technique: 'Escucha el groove y deja que las palabras fluyan naturalmente.' }
        ]
    },
    trap: {
        icon: '🐍', name: 'Trap', color: '#9b59b6',
        desc: 'Técnicas melódicas del Trap moderno con auto-tune y tripletas.',
        lessons: [
            { title: 'Melodic Rap', desc: 'Canta-rap sobre notas sostenidas, como Future o Lil Uzi Vert.', tip: 'Mantén la nota tan estable como puedas. El auto-tune sonará mejor con notas limpias.', notes: [64,64,67,67,72,72,72,67], duration: 1200, technique: 'Sostén cada nota sin vibrato para un sonido más electrónico.' },
            { title: 'Triplet Flow', desc: 'El patrón rítmico característico del Trap: tres sílabas por golpe.', tip: 'Di "ta-ta-ta" repetidamente al ritmo. Luego sustituye con palabras reales.', notes: [60,62,64,60,62,64,67,69], duration: 700, technique: 'Las tres sílabas deben tener la misma duración y intensidad.' },
            { title: 'Ad-Libs', desc: 'Practica los sonidos característicos: "yeah", "skrt", "ayy" con entonación.', tip: 'Los ad-libs se cantan en notas diferentes al verso principal para crear contraste.', notes: [72,69,67,72,74,72,69,67], duration: 900, technique: 'Los ad-libs agudos generan energía. Los graves dan peso.' },
            { title: 'Voz Rasposa', desc: 'Aprende a usar un ligero rasgado vocal para dar textura al Trap.', tip: 'No fuerces. Empieza con un susurro rasposo y aumenta la presión gradualmente.', notes: [55,57,58,60,60,58,57,55], duration: 1100, technique: 'El fry vocal se genera con poca presión de aire y relajación de cuerdas.' },
            { title: 'Auto-Tune Practice', desc: 'Canta escalas cromáticas para practificar la afinación que el auto-tune necesita.', tip: 'El auto-tune funciona mejor cuando cantas muy cerca de la nota correcta.', notes: [60,61,62,63,64,63,62,61], duration: 800, technique: 'Ve semitono por semitono. El auto-tune corrige ±50 cents.' }
        ]
    },
    boombap: {
        icon: '📻', name: 'Boom Bap', color: '#d4a843',
        desc: 'Cadencia clásica del Boom Bap de los 90. Flow orgánico sobre beats de vinilo.',
        lessons: [
            { title: 'Pocket Flow', desc: 'Quédate "en el bolsillo" del beat — ni adelante ni atrás.', tip: 'Escucha el boom y el bap. Tu voz debe caer como un tercero instrumento.', notes: [60,60,64,64,67,67,64,60], duration: 1000, technique: 'El Boom Bap premia la constancia sobre la velocidad.' },
            { title: 'Rhyme Scheme', desc: 'Practica esquemas de rima AABB y ABAB rapeando sobre notas.', tip: 'Enfócate en las finales de verso. Ahí es donde vive la rima.', notes: [60,62,64,62,67,69,67,64], duration: 1100, technique: 'Las sílabas rimadas deben tener la misma entonación.' },
            { title: 'Densidad Lírica', desc: 'Más palabras por compás sin perder el groove.', tip: 'Empieza con 4 palabras por golpe y sube a 6 y 8. Nunca sacrifiques el ritmo.', notes: [60,62,64,65,67,69,71,72], duration: 800, technique: 'Las palabras monosílabas son más fáciles de apretar en el beat.' },
            { title: 'Doblaje de Voz', desc: 'Practica grabar tu voz dos veces para un sonido más grueso.', tip: 'Canta la segunda toma ligeramente diferente. La imperfección crea textura.', notes: [60,64,67,64,60,55,60,64], duration: 1000, technique: 'El doblaje no debe ser idéntico. Variación sutil = grosor natural.' },
            { title: 'Storytelling', desc: 'Cuenta una historia manteniendo emoción y variación tonal.', tip: 'Sube el tono en los momentos de tensión, baja en la resolución.', notes: [55,60,64,67,69,67,62,55], duration: 1300, technique: 'El storytelling necesita dinámica: suave, fuerte, suspenso, resolución.' }
        ]
    },
    dancehall: {
        icon: '🌴', name: 'Dancehall', color: '#2ecc71',
        desc: 'Toasting, melisma y la energía del Dancehall jamaicano.',
        lessons: [
            { title: 'Toasting Básico', desc: 'La precursora del rap: patrón rítmico melódico sobre un rhythm.', tip: 'El toasting es mitad canto, mitad habla. Encuentra la nota y mantenla.', notes: [60,64,67,72,67,64,60,55], duration: 900, technique: 'La voz debe tener "bounce" — sube y baja con el rhythm.' },
            { title: 'Melisma', desc: 'Mover tu voz entre varias notas sobre una sola sílaba.', tip: 'Empieza con Do-Mi-Do sobre "ahh". Luego agrega más notas.', notes: [60,62,64,67,64,62,60,58], duration: 1100, technique: 'El melisma debe ser fluido, como agua que se desliza entre notas.' },
            { title: 'Patois Delivery', desc: 'Practica la entonación y el ritmo del patois jamaicano.', tip: 'Acentúa diferente al español. Las finales de palabra suben el tono.', notes: [64,67,69,72,69,67,64,62], duration: 1000, technique: 'El patois tiene un "swing" natural que lo hace musical.' },
            { title: 'Singjaying', desc: 'La mezcla perfecta entre singing y deejaying (toasting).', tip: 'Alterna entre frase melódica y frase rítmica hablada.', notes: [60,64,69,72,74,72,67,60], duration: 1000, technique: 'Los cantantes de Dancehall no eligen — hacen ambas cosas.' },
            { title: 'Energía de Club', desc: 'Mantén energía alta y constante durante todo el performance.', tip: 'Respira entre frases largas. La energía viene del ritmo, no de gritar.', notes: [67,69,72,74,76,74,72,69], duration: 850, technique: 'El Dancehall exige energía sin perder control vocal.' }
        ]
    },
    reggaeton: {
        icon: '🔥', name: 'Reggaetón', color: '#e74c8b',
        desc: 'Flow de perreo, hooks pegajosos y el ritmo del Dem Bow.',
        lessons: [
            { title: 'Flow Dem Bow', desc: 'El patrón base del Reggaetón: "boom-ch-boom-ch" en tu delivery.', tip: 'Repite "dembow" en voz alta y siente el patrón. Ahora rapea sobre ese ritmo.', notes: [60,60,64,64,60,60,64,64], duration: 750, technique: 'Las sílabas pares van en el "boom" y las impares en el "ch".' },
            { title: 'Hook Pegajoso', desc: 'Crea y canta hooks que se queden en la cabeza.', tip: 'Los hooks usan notas repetidas con variación rítmica. Simplifica pero hazlo memorable.', notes: [67,67,69,67,64,64,62,60], duration: 1000, technique: 'Un buen hook se puede cantar después de escucharlo una sola vez.' },
            { title: 'Urraca', desc: 'La técnica de "urraca" — voz rápida y cortante del Reggaetón.', tip: 'Articula cada sílaba con precisión. Piensa en golpes secos y rápidos.', notes: [60,64,67,72,67,64,67,72], duration: 650, technique: 'Las consonantes "T", "K", "P" dan el golpe percusivo.' },
            { title: 'Melodía Urbana', desc: 'Cantabilidad melódica sobre beats urbanos, estilo Bad Bunny / Ozuna.', tip: 'No necesitas ser un soprano. La melodía urbana vive en un rango cómodo.', notes: [60,62,64,67,69,72,69,64], duration: 1100, technique: 'La melodía urbana usa notas cercanas. Los saltos grandes son para énfasis.' },
            { title: 'Dúo Reggaeton', desc: 'Practica alternar entre voz suave y voz potente en la misma canción.', tip: 'El verso suave, el pre-chorus sube, el chorus explota. Dinámica.', notes: [55,60,64,67,72,67,60,55], duration: 1200, technique: 'La dinámica es lo que hace un reggaetón interesante de principio a fin.' }
        ]
    },
    pop: {
        icon: '🌟', name: 'Pop', color: '#e040fb',
        desc: 'Técnicas de canto Pop de alto nivel — belt, mix voice, y hooks profesionales.',
        special: true,
        lessons: [
            { title: 'Voz de Pecho (Chest Voice)', desc: 'La base de todo cantante Pop. Potencia y calidez en el registro grave.', tip: 'Coloca la mano en el pecho. Debes sentir vibración al cantar notas graves.', notes: [55,58,60,62,64,62,60,55], duration: 1200, technique: 'El chest voice es la voz de hablar pero amplificada y proyectada.' },
            { title: 'Voz de Cabeza (Head Voice)', desc: 'Notas agudas limpias y brillantes sin forzar la garganta.', tip: 'Imagina que eres una sirena. La vibración debe sentirse arriba, en la máscara facial.', notes: [67,72,76,79,76,72,67,64], duration: 1200, technique: 'La garganta debe estar relajada. Si duele, estás forzando.' },
            { title: 'Mix Voice', desc: 'La fusión perfecta entre chest y head voice — la herramienta del Pop moderno.', tip: 'Canta "nyah-nyah-nyah" subiendo la escala. Esa es la zona de mix.', notes: [60,64,67,72,76,72,67,60], duration: 1000, technique: 'El mix voice se siente como una voz que sube sin "romperse" entre registros.' },
            { title: 'Belt Control', desc: 'Notas agudas potentes con proyección — el "power note" del Pop.', tip: 'Abre la boca en "AH" y proyecta hacia adelante, no hacia arriba.', notes: [67,69,72,74,76,74,72,67], duration: 1100, technique: 'El belt se sostiene con aire constante y resonancia en la máscara.' },
            { title: 'Runs y Riffs', desc: 'Escalas rápidas y adornos vocales como Beyoncé y Ariana Grande.', tip: 'Empieza lento. Cada nota del run debe ser clara antes de acelerar.', notes: [60,62,64,67,69,72,74,76], duration: 700, technique: 'Los runs son escalas cantadas rápido. La precisión es más importante que la velocidad.' },
            { title: 'Falsetto', desc: 'El registro más agudo — delicado y etéreo para momentos suaves.', tip: 'Susurra un "whoo" agudo. Eso es falsetto. Ahora dale más volumen sin cambiar el tono.', notes: [72,76,79,81,79,76,72,69], duration: 1300, technique: 'El falsetto no tiene tanta potencia como head voice pero suena delicado.' },
            { title: 'Vibrato Controlado', desc: 'El vibrato es una oscilación natural. Aprende a controlarlo.', tip: 'Sostén una nota larga y deja que la voz oscile naturalmente. No lo forces.', notes: [64,64,64,64,64,64,64,64], duration: 2000, technique: 'Un vibrato natural oscila ±50 cents a ~6Hz. Si es más rápido, es temblor.' },
            { title: 'Performance Completo', desc: 'Combina todas las técnicas Pop en un mini-performance de 30 segundos.', tip: 'Empieza suave (chest), sube (mix), alcanza el clímax (belt), y termina suave (falsetto).', notes: [55,60,64,67,72,76,72,60], duration: 1400, technique: 'La dinámica emocional es lo que separa a un cantante bueno de uno memorable.' }
        ]
    },
    rock: {
        icon: '🎸', name: 'Rock', color: '#ff1744',
        desc: 'Grit, potencia y energía pura. Técnicas de canto Rock profesional.',
        special: true,
        lessons: [
            { title: 'Proyección Rock', desc: 'Cantar fuerte sin destruir tu voz. La base del Rock.', tip: 'Proyecta hacia adelante, no hacia arriba. Imagina que le cantas a alguien al otro lado del escenario.', notes: [60,64,67,72,72,67,64,60], duration: 1000, technique: 'La potencia viene del diafragma, nunca de apretar la garganta.' },
            { title: 'Rasgado Controlado', desc: 'El "distorsion vocal" que define el Rock. Rasgo seguro y controlado.', tip: 'Empieza con un susurro rasposo, luego añade aire. Nunca rasgues con fuerza bruta.', notes: [55,55,58,60,60,58,55,55], duration: 1100, technique: 'El grit seguro usa las bandas falsas, no las cuerdas vocales principales.' },
            { title: 'High Notes Rock', desc: 'Notas agudas con potencia estilo Freddie Mercury / Chester Bennington.', tip: 'Antes de cada nota alta, baja la laringe y abre la garganta. Siente el espacio.', notes: [67,69,72,74,76,74,72,67], duration: 1100, technique: 'Las notas agudas del Rock necesitan apoyo constante de aire y resonancia abierta.' },
            { title: 'Power Ballad', desc: 'Control dinámico: de lo suave a lo explosivo en una misma canción.', tip: 'Los power ballads empiezan como una canción de cuna y terminan como una explosión.', notes: [55,60,62,64,67,72,67,55], duration: 1500, technique: 'La clave es la transición: suave → medio → fuerte debe ser gradual.' },
            { title: 'Screaming Basics', desc: 'Introducción al screaming vocal — técnica de metalcore y hard rock.', tip: 'PRIMERO: Aprende a hacer "fry scream" con susurro. NUNCA fuerces la garganta.', notes: [55,57,58,60,58,57,55,53], duration: 900, technique: 'El fry scream se genera con poca presión de aire y relajación total de cuerdas.' },
            { title: 'Armonías Rock', desc: 'Canta armonías de tercera y quinta sobre una melodía base.', tip: 'Canta la melodía original, luego canta una tercera arriba. Si suena bien, es una armonía.', notes: [60,64,67,72,67,64,60,55], duration: 1200, technique: 'Las armonías del Rock suenan mejor cuando ambas voces tienen la misma energía.' },
            { title: 'Stage Presence Vocal', desc: 'Cantar mientras te mueves, interactúas y dominas el escenario.', tip: 'Practica cantando de pie, caminando, y moviendo los brazos. El cuerpo afecta la voz.', notes: [60,62,64,67,69,72,74,76], duration: 1000, technique: 'Una buena postura = mejor soporte = mejor canto. Hombros atrás, pecho abierto.' },
            { title: 'Rock Full Power', desc: 'Performance completa con grit, belt y dinámica máxima.', tip: 'Reserva tu energía más explosiva para el coro. El verso puede ser intenso pero contenido.', notes: [55,60,67,72,76,72,67,55], duration: 1300, technique: 'El mejor canto Rock combina técnica impecable con emoción desbordada.' }
        ]
    }
};

// ============================================================
// WARMUP STEPS
// ============================================================
const WARMUP_STEPS = [
    { icon: '💧', title: 'Respiración Diafragmática', desc: 'Inhala profundamente expandiendo el abdomen. Sostén 4 segundos. Exhala lentamente haciendo sonido "sss" durante 8 segundos.', instruction: 'Escucha el tono y canta manteniendo una nota constante', note: 60, duration: 60 },
    { icon: '🐝', title: 'Zumbido de Labios', desc: 'Cierra los labios y vibra produciendo un zumbido suave. Sube y baja gradualmente el tono.', instruction: 'Zumba y mantén la nota que escuchas', note: 64, duration: 45 },
    { icon: '😮', title: 'Apertura de Mandíbula', desc: 'Abre la boca como si dijeras "Ah" en un tono sostenido. Sube y baja por la escala.', instruction: 'Canta "Aaaah" con la nota que escuchas', note: 67, duration: 45 },
    { icon: '🗣️', title: 'Trinos de Lengua', desc: 'Pronuncia "La-La-La" rápidamente sobre la misma nota.', instruction: 'Repite "La-La-La" al ritmo que escuchas', note: 69, duration: 40 },
    { icon: '🎵', title: 'Escala de Calentamiento', desc: 'Canta una escala mayor subiendo y bajando. Comienza suave.', instruction: 'Sigue la escala nota por nota', note: 60, duration: 30 },
    { icon: '🌊', title: 'Glissando Vocal', desc: 'Desliza tu voz suavemente de graves a agudos y viceversa.', instruction: 'Desliza tu voz con el tono que escuchas', note: 55, duration: 45 }
];

// ============================================================
// STATE
// ============================================================
let currentExercise = null, exerciseRunning = false, exerciseTimeout = null;
let currentNoteIndex = 0, noteMatches = [];
let warmupStep = 0, warmupRunning = false, warmupTimer = null, warmupElapsed = 0;
let tunerActive = false;

// Style / Lesson state
let currentStyleId = null;
let currentLessonIndex = 0;
let currentLessonStepIndex = 0;
let lessonRunning = false;
let lessonExerciseRunning = false;
let lessonTimeout = null;
let lessonNoteMatches = [];

// Stats
let stats = loadStats();
let styleProgress = loadStyleProgress();

// ============================================================
// STATS & PROGRESS PERSISTENCE
// ============================================================
function loadStats() {
    try {
        const s = localStorage.getItem('vc_stats');
        return s ? JSON.parse(s) : { sessions: 0, accuracies: [], bestAccuracy: 0, lowestNote: null, highestNote: null };
    } catch { return { sessions: 0, accuracies: [], bestAccuracy: 0, lowestNote: null, highestNote: null }; }
}
function saveStats() { try { localStorage.setItem('vc_stats', JSON.stringify(stats)); } catch {} }

function loadStyleProgress() {
    try {
        const s = localStorage.getItem('vc_style_progress');
        return s ? JSON.parse(s) : {};
    } catch { return {}; }
}
function saveStyleProgress() { try { localStorage.setItem('vc_style_progress', JSON.stringify(styleProgress)); } catch {} }

function isLessonCompleted(styleId, lessonIndex) {
    return styleProgress[styleId] && styleProgress[styleId][lessonIndex] === true;
}
function markLessonCompleted(styleId, lessonIndex) {
    if (!styleProgress[styleId]) styleProgress[styleId] = {};
    styleProgress[styleId][lessonIndex] = true;
    saveStyleProgress();
}
function getCompletedCount(styleId) {
    if (!styleProgress[styleId]) return 0;
    return Object.values(styleProgress[styleId]).filter(v => v === true).length;
}
function getNextIncompleteLesson(styleId) {
    const lessons = STYLE_DATA[styleId].lessons;
    for (let i = 0; i < lessons.length; i++) {
        if (!isLessonCompleted(styleId, i)) return i;
    }
    return -1; // all done
}

function resetStats() {
    if (confirm('¿Borrar todas las estadísticas?')) {
        stats = { sessions: 0, accuracies: [], bestAccuracy: 0, lowestNote: null, highestNote: null };
        styleProgress = {};
        saveStats(); saveStyleProgress();
        updateAnalysisScreen();
        updateStylesGrid();
    }
}

// ============================================================
// NAVIGATION
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'screen-analysis') updateAnalysisScreen();
    if (id === 'screen-warmup') resetWarmup();
    if (id === 'screen-styles') updateStylesGrid();
}
function goHome() {
    stopListening(); stopExercise(); stopWarmup(); stopLesson();
    showScreen('screen-home');
}

// ============================================================
// STYLES GRID UPDATE
// ============================================================
function updateStylesGrid() {
    Object.keys(STYLE_DATA).forEach(id => {
        const el = document.getElementById('progress-' + id);
        if (el) {
            const completed = getCompletedCount(id);
            const total = STYLE_DATA[id].lessons.length;
            el.textContent = completed + '/' + total;
        }
    });
}

// ============================================================
// OPEN STYLE DETAIL
// ============================================================
function openStyle(styleId) {
    currentStyleId = styleId;
    const data = STYLE_DATA[styleId];
    document.getElementById('style-detail-title').textContent = data.name;
    document.getElementById('style-detail-name').textContent = data.name;
    document.getElementById('style-detail-desc').textContent = data.desc;
    document.getElementById('style-detail-icon').textContent = data.icon;
    document.getElementById('style-detail-completed').textContent = getCompletedCount(styleId) + ' completadas';
    document.getElementById('style-detail-total').textContent = 'de ' + data.lessons.length + ' lecciones';

    // Color the header
    const header = document.getElementById('style-detail-header');
    header.style.background = `linear-gradient(135deg, ${data.color}22, ${data.color}11)`;
    header.style.borderColor = data.color + '44';

    // Build lessons list
    const listEl = document.getElementById('lessons-list');
    listEl.innerHTML = '';
    data.lessons.forEach((lesson, i) => {
        const completed = isLessonCompleted(styleId, i);
        const item = document.createElement('div');
        item.className = 'lesson-item' + (completed ? ' completed' : '');
        item.innerHTML = `
            <div class="lesson-checkbox">${completed ? '✓' : ''}</div>
            <div class="lesson-info">
                <strong>${lesson.title}</strong>
                <span>${completed ? '✅ Lección completada' : lesson.desc}</span>
            </div>
            <span class="lesson-arrow">›</span>
        `;
        item.onclick = () => openLesson(i);
        listEl.appendChild(item);
    });

    // Show continue button if there are incomplete lessons
    const nextIdx = getNextIncompleteLesson(styleId);
    const continueBtn = document.getElementById('style-continue-btn');
    if (nextIdx >= 0) {
        continueBtn.style.display = 'block';
        continueBtn.textContent = '▶ Continuar: ' + data.lessons[nextIdx].title;
        continueBtn.onclick = () => openLesson(nextIdx);
    } else {
        continueBtn.style.display = 'none';
    }

    showScreen('screen-style-detail');
}

// ============================================================
// OPEN LESSON
// ============================================================
function openLesson(lessonIndex) {
    currentLessonIndex = lessonIndex;
    currentLessonStepIndex = 0;
    lessonRunning = true;
    lessonNoteMatches = [];

    const data = STYLE_DATA[currentStyleId];
    const lesson = data.lessons[lessonIndex];

    document.getElementById('lesson-title').textContent = lesson.title;
    updateLessonStepUI();
    showScreen('screen-lesson');
}

function updateLessonStepUI() {
    const data = STYLE_DATA[currentStyleId];
    const lesson = data.lessons[currentLessonIndex];

    document.getElementById('lesson-step-label').textContent = `Paso ${currentLessonStepIndex + 1} de ${lesson.notes.length}`;
    document.getElementById('lesson-step-title').textContent = lesson.title;
    document.getElementById('lesson-step-desc').textContent = lesson.desc;
    document.getElementById('lesson-step-tip').textContent = lesson.technique || lesson.tip || '';

    // Progress bar
    const pct = ((currentLessonStepIndex) / lesson.notes.length) * 100;
    document.getElementById('lesson-progress-fill').style.width = pct + '%';

    // Target note
    const targetMidi = lesson.notes[currentLessonStepIndex];
    const targetNote = midiToNote(targetMidi);
    document.getElementById('lesson-target-note').textContent = targetNote.name + targetNote.octave;
    document.getElementById('lesson-current-note').textContent = '--';
    document.getElementById('lesson-current-note').className = 'current-note';

    // Note sequence
    const seqEl = document.getElementById('lesson-note-sequence');
    seqEl.innerHTML = '';
    lesson.notes.forEach((midi, i) => {
        const note = midiToNote(midi);
        const chip = document.createElement('span');
        chip.className = 'note-chip';
        chip.textContent = note.name + note.octave;
        chip.dataset.index = i;
        seqEl.appendChild(chip);
    });

    // Hide feedback, show exercise
    document.getElementById('lesson-feedback').style.display = 'none';
    document.getElementById('lesson-start-btn').style.display = 'block';
    document.getElementById('lesson-start-btn').textContent = '▶ Ejecutar Ejercicio';

    updateLessonHighlight();
}

function updateLessonHighlight() {
    const chips = document.querySelectorAll('#lesson-note-sequence .note-chip');
    chips.forEach((c, i) => {
        if (i === currentLessonStepIndex) c.classList.add('active');
        else if (!c.classList.contains('done') && !c.classList.contains('missed')) c.classList.remove('active');
    });
}

// ============================================================
// LESSON EXERCISE CONTROL
// ============================================================
async function toggleLessonExercise() {
    if (lessonExerciseRunning) {
        stopLessonExercise();
        return;
    }

    lessonExerciseRunning = true;
    document.getElementById('lesson-start-btn').textContent = '⏹ Detener';

    if (!isListening) await startListening();

    const data = STYLE_DATA[currentStyleId];
    const lesson = data.lessons[currentLessonIndex];
    const targetMidi = lesson.notes[currentLessonStepIndex];
    playReferenceTone(targetMidi);

    // Auto-advance after duration
    lessonTimeout = setTimeout(() => {
        finishLessonStep();
    }, lesson.duration);
}

function stopLessonExercise() {
    lessonExerciseRunning = false;
    clearTimeout(lessonTimeout);
    stopReferenceTone();
    document.getElementById('lesson-start-btn').textContent = '▶ Ejecutar Ejercicio';
}

function finishLessonStep() {
    lessonExerciseRunning = false;
    clearTimeout(lessonTimeout);
    stopReferenceTone();

    // Calculate step accuracy
    const onTarget = lessonNoteMatches[currentLessonStepIndex];
    const accuracy = lessonNoteMatches.filter(m => m === true).length;
    const total = lessonNoteMatches.length || 1;
    const pct = Math.round((accuracy / total) * 100);

    // Show feedback
    document.getElementById('lesson-start-btn').style.display = 'none';
    document.getElementById('lesson-feedback').style.display = 'block';

    const icon = pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '🔄';
    const text = pct >= 70
        ? `¡Excelente precisión (${pct}%)! Dominaste esta nota.`
        : pct >= 40
        ? `Buena intención (${pct}%). Intenta acercarte más a la nota objetivo.`
        : `Sigue practicando (${pct}%). Escucha el tono de referencia otra vez.`;

    document.getElementById('feedback-icon').textContent = icon;
    document.getElementById('feedback-text').textContent = text;

    // Update ring
    document.getElementById('lesson-ring-text').textContent = pct + '%';
    document.getElementById('lesson-ring-fill').style.strokeDashoffset = 327 - (pct / 100) * 327;
}

function nextLessonStep() {
    const data = STYLE_DATA[currentStyleId];
    const lesson = data.lessons[currentLessonIndex];

    // Mark current note result
    const chips = document.querySelectorAll('#lesson-note-sequence .note-chip');
    if (chips[currentLessonStepIndex]) {
        chips[currentLessonStepIndex].classList.remove('active');
        chips[currentLessonStepIndex].classList.add(lessonNoteMatches[currentLessonStepIndex] ? 'done' : 'missed');
    }

    currentLessonStepIndex++;

    if (currentLessonStepIndex >= lesson.notes.length) {
        // Lesson complete!
        completeLesson();
        return;
    }

    updateLessonStepUI();
}

function completeLesson() {
    markLessonCompleted(currentStyleId, currentLessonIndex);

    // Update stats
    const accuracy = getLessonAccuracy();
    stats.sessions++;
    stats.accuracies.push(accuracy);
    if (accuracy > stats.bestAccuracy) stats.bestAccuracy = accuracy;
    saveStats();

    // Show completion
    document.getElementById('lesson-step-title').textContent = '🏆 ¡Lección Completada!';
    document.getElementById('lesson-step-desc').textContent = STYLE_DATA[currentStyleId].lessons[currentLessonIndex].title + ' — ¡Completada con éxito!';
    document.getElementById('lesson-step-tip').textContent = '✅ Esta lección está marcada como completada. Puedes repetirla o continuar con la siguiente.';
    document.getElementById('lesson-start-btn').style.display = 'none';
    document.getElementById('lesson-feedback').style.display = 'block';
    document.getElementById('feedback-icon').textContent = '🏆';
    document.getElementById('feedback-text').textContent = `¡Felicidades! Precisión: ${accuracy}%. Has completado esta lección.`;

    const nextBtn = document.getElementById('next-step-btn');
    const nextIdx = getNextIncompleteLesson(currentStyleId);
    if (nextIdx >= 0) {
        nextBtn.textContent = 'Siguiente Lección →';
        nextBtn.onclick = () => { nextBtn.onclick = nextLessonStep; openLesson(nextIdx); };
    } else {
        nextBtn.textContent = '🎉 ¡Todas las Lecciones Completadas!';
        nextBtn.onclick = () => openStyle(currentStyleId);
    }

    document.getElementById('lesson-progress-fill').style.width = '100%';
}

function getLessonAccuracy() {
    if (noteMatches.length === 0 && lessonNoteMatches.length === 0) return 0;
    const matches = lessonNoteMatches.length > 0 ? lessonNoteMatches : noteMatches;
    const onTarget = matches.filter(m => m === true).length;
    return Math.round((onTarget / matches.length) * 100);
}

function exitLesson() {
    stopLessonExercise();
    lessonRunning = false;
    openStyle(currentStyleId);
}

function stopLesson() {
    stopLessonExercise();
    lessonRunning = false;
}

// ============================================================
// AUDIO CONTEXT & PITCH DETECTION
// ============================================================
async function startListening() {
    if (isListening) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        microphone = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);
        isListening = true;
        detectPitch();
    } catch (err) {
        console.error('Mic error:', err);
        alert('No se pudo acceder al micrófono. Asegúrate de dar permiso.');
    }
}

function stopListening() {
    isListening = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (microphone) {
        microphone.disconnect();
        try { microphone.mediaStream.getTracks().forEach(t => t.stop()); } catch {}
    }
    if (audioCtx) audioCtx.close().catch(() => {});
    analyser = null; microphone = null; audioCtx = null;
}

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.008) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thres) { r1 = i; break; } }
    for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; } }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
    let T0 = maxpos;

    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}

function getRMS(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
}

// ============================================================
// DETECTION LOOP
// ============================================================
function detectPitch() {
    if (!isListening || !analyser) return;

    const bufSize = analyser.fftSize;
    const buf = new Float32Array(bufSize);
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, audioCtx.sampleRate);
    const rms = getRMS(buf);

    const volPct = Math.min(100, Math.round(rms * 500));
    document.getElementById('volume-bar').style.width = volPct + '%';
    document.getElementById('volume-value').textContent = volPct + '%';

    if (freq > 0) {
        const midi = freqToMidi(freq);
        const note = midiToNote(midi);
        const cents = centsOffPitch(freq, midiToFreq(midi));

        // TUNER UI
        if (tunerActive) {
            document.getElementById('tuner-note').textContent = note.name;
            document.getElementById('tuner-octave').textContent = note.octave;
            document.getElementById('tuner-freq').textContent = Math.round(freq) + ' Hz';

            const needlePos = 50 + cents * 0.8;
            const clampedPos = Math.max(5, Math.min(95, needlePos));
            const needle = document.getElementById('tuner-needle');
            needle.style.left = clampedPos + '%';

            if (Math.abs(cents) <= 5) {
                needle.className = 'meter-needle in-tune';
                document.getElementById('tuner-status').textContent = '✅ ¡Perfecto! Estás bien afinado';
            } else if (Math.abs(cents) <= 20) {
                needle.className = 'meter-needle sharp';
                document.getElementById('tuner-status').textContent = cents > 0 ? '↑ Un poco agudo' : '↓ Un poco bajo';
            } else {
                needle.className = 'meter-needle flat';
                document.getElementById('tuner-status').textContent = cents > 0 ? '⚠ Demasiado agudo' : '⚠ Demasiado bajo';
            }
            document.getElementById('tuner-cents').textContent = cents + ' cents';
        }

        // LESSON pitch
        if (lessonExerciseRunning) handleLessonPitch(freq, midi);

        // GENERIC EXERCISE pitch
        if (exerciseRunning) handleExercisePitch(freq);
    }

    drawWaveform(buf, 'waveform-canvas');

    // Warmup waveform
    if (warmupRunning) drawWaveform(buf, 'warmup-waveform');

    animFrameId = requestAnimationFrame(detectPitch);
}

// ============================================================
// LESSON PITCH HANDLER
// ============================================================
function handleLessonPitch(freq, midi) {
    if (!STYLE_DATA[currentStyleId]) return;
    const lesson = STYLE_DATA[currentStyleId].lessons[currentLessonIndex];
    if (!lesson) return;

    const targetMidi = lesson.notes[currentLessonStepIndex];
    const cents = centsOffPitch(freq, midiToFreq(targetMidi));
    const note = midiToNote(midi);

    const currentEl = document.getElementById('lesson-current-note');
    currentEl.textContent = note.name + note.octave;

    const pitchBar = document.getElementById('lesson-pitch-bar');
    const barPos = 50 + cents * 0.5;
    pitchBar.style.left = Math.max(5, Math.min(95, barPos)) + '%';

    if (Math.abs(cents) <= 10) {
        currentEl.className = 'current-note on-pitch';
        pitchBar.className = 'pitch-bar on-target';
        if (lessonNoteMatches[currentLessonStepIndex] === undefined)
            lessonNoteMatches[currentLessonStepIndex] = true;
    } else {
        currentEl.className = 'current-note off-pitch';
        pitchBar.className = 'pitch-bar off-target';
        if (lessonNoteMatches[currentLessonStepIndex] === undefined)
            lessonNoteMatches[currentLessonStepIndex] = false;
    }
}

// ============================================================
// WAVEFORM
// ============================================================
function drawWaveform(buf, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += H / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(124,77,255,0.2)';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, '#7c4dff');
    gradient.addColorStop(0.5, '#e040fb');
    gradient.addColorStop(1, '#7c4dff');

    ctx.strokeStyle = gradient; ctx.lineWidth = 2; ctx.beginPath();
    const sliceWidth = W / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
        const y = (1 + buf[i] * 2) * H / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(124,77,255,0.15)'; ctx.lineWidth = 6; ctx.stroke();
}

// ============================================================
// TUNER TOGGLE
// ============================================================
function toggleTuner() {
    if (!tunerActive) {
        tunerActive = true;
        startListening();
        document.getElementById('tuner-btn').textContent = '⏹ Detener';
        document.getElementById('tuner-btn').classList.add('recording');
        document.getElementById('tuner-status').textContent = '🎤 Escuchando... Canta una nota';
    } else {
        tunerActive = false;
        stopListening();
        resetTunerUI();
        document.getElementById('tuner-btn').textContent = '▶ Iniciar';
        document.getElementById('tuner-btn').classList.remove('recording');
        document.getElementById('tuner-status').textContent = 'Presiona "Iniciar" para comenzar';
    }
}
function resetTunerUI() {
    document.getElementById('tuner-note').textContent = '--';
    document.getElementById('tuner-octave').textContent = '';
    document.getElementById('tuner-freq').textContent = '0 Hz';
    document.getElementById('tuner-needle').style.left = '50%';
    document.getElementById('tuner-needle').className = 'meter-needle';
    document.getElementById('tuner-cents').textContent = '0 cents';
    document.getElementById('volume-bar').style.width = '0%';
    document.getElementById('volume-value').textContent = '0%';
}

// ============================================================
// GENERIC EXERCISES
// ============================================================
function selectExercise(id) {
    currentExercise = { id, ...EXERCISES[id] };
    document.querySelectorAll('.exercise-item').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById('exercise-title').textContent = currentExercise.name;
    document.getElementById('exercise-desc').textContent = currentExercise.desc;

    const seqEl = document.getElementById('note-sequence');
    seqEl.innerHTML = '';
    currentExercise.notes.forEach((midi, i) => {
        const note = midiToNote(midi);
        const chip = document.createElement('span');
        chip.className = 'note-chip';
        chip.textContent = note.name + note.octave;
        seqEl.appendChild(chip);
    });
    updateExerciseDisplay();
}
function updateExerciseDisplay() {
    if (!currentExercise) return;
    const note = midiToNote(currentExercise.notes[currentNoteIndex]);
    document.getElementById('exercise-target-note').textContent = note.name + note.octave;
}
async function startExercise() {
    if (!currentExercise) { alert('Selecciona un ejercicio primero.'); return; }
    if (exerciseRunning) { stopExercise(); return; }
    exerciseRunning = true;
    currentNoteIndex = 0;
    noteMatches = [];
    document.getElementById('start-exercise-btn').textContent = '⏹ Detener';
    if (!isListening) await startListening();
    updateNoteHighlight();
    updateExerciseDisplay();
    playReferenceTone(currentExercise.notes[0]);
    exerciseTimeout = setTimeout(() => advanceExerciseNote(), currentExercise.noteDuration);
}
function advanceExerciseNote() {
    if (!exerciseRunning || !currentExercise) return;
    const chips = document.querySelectorAll('#note-sequence .note-chip');
    if (chips[currentNoteIndex]) {
        chips[currentNoteIndex].classList.remove('active');
        chips[currentNoteIndex].classList.add(noteMatches[currentNoteIndex] ? 'done' : 'missed');
    }
    currentNoteIndex++;
    if (currentNoteIndex >= currentExercise.notes.length) { finishExercise(); return; }
    updateNoteHighlight();
    updateExerciseDisplay();
    playReferenceTone(currentExercise.notes[currentNoteIndex]);
    exerciseTimeout = setTimeout(() => advanceExerciseNote(), currentExercise.noteDuration);
}
function updateNoteHighlight() {
    document.querySelectorAll('#note-sequence .note-chip').forEach((c, i) => {
        if (i === currentNoteIndex) c.classList.add('active');
        else if (!c.classList.contains('done') && !c.classList.contains('missed')) c.classList.remove('active');
    });
}
function handleExercisePitch(freq) {
    if (!exerciseRunning || !currentExercise) return;
    const midi = freqToMidi(freq);
    const targetMidi = currentExercise.notes[currentNoteIndex];
    const cents = centsOffPitch(freq, midiToFreq(targetMidi));
    const note = midiToNote(midi);
    const el = document.getElementById('exercise-current-note');
    el.textContent = note.name + note.octave;

    const pitchBar = document.getElementById('exercise-pitch-bar');
    pitchBar.style.left = Math.max(5, Math.min(95, 50 + cents * 0.5)) + '%';

    if (Math.abs(cents) <= 10) {
        el.className = 'current-note on-pitch';
        pitchBar.className = 'pitch-bar on-target';
        if (noteMatches[currentNoteIndex] === undefined) noteMatches[currentNoteIndex] = true;
    } else {
        el.className = 'current-note off-pitch';
        pitchBar.className = 'pitch-bar off-target';
        if (noteMatches[currentNoteIndex] === undefined) noteMatches[currentNoteIndex] = false;
    }

    const accuracy = noteMatches.filter(m => m === true).length;
    const total = noteMatches.length || 1;
    const pct = Math.round((accuracy / total) * 100);
    document.getElementById('ring-text').textContent = pct + '%';
    document.getElementById('ring-fill').style.strokeDashoffset = 327 - (pct / 100) * 327;
}
function stopExercise() {
    exerciseRunning = false;
    clearTimeout(exerciseTimeout);
    stopReferenceTone();
    document.getElementById('start-exercise-btn').textContent = '▶ Ejecutar Ejercicio';
    document.querySelectorAll('#note-sequence .note-chip').forEach(c => c.classList.remove('active'));
}
function finishExercise() {
    exerciseRunning = false;
    clearTimeout(exerciseTimeout);
    stopReferenceTone();
    const accuracy = getLessonAccuracy();
    stats.sessions++;
    stats.accuracies.push(accuracy);
    if (accuracy > stats.bestAccuracy) stats.bestAccuracy = accuracy;
    saveStats();
    document.getElementById('exercise-current-note').textContent = '🎉';
    document.getElementById('start-exercise-btn').textContent = '▶ Ejecutar de Nuevo';
    let msg = accuracy >= 90 ? '¡Excelente! 🌟' : accuracy >= 70 ? '¡Bien hecho! 👏' : accuracy >= 50 ? 'Buen intento 💪' : 'Sigue practicando 🎯';
    document.getElementById('exercise-desc').textContent = msg + ' Precisión: ' + accuracy + '%';
}

// ============================================================
// WARMUP
// ============================================================
function resetWarmup() {
    warmupStep = 0; warmupRunning = false; warmupElapsed = 0;
    clearInterval(warmupTimer);
    updateWarmupUI();
}
function updateWarmupUI() {
    const step = WARMUP_STEPS[warmupStep];
    document.getElementById('warmup-icon').textContent = step.icon;
    document.getElementById('warmup-title').textContent = step.title;
    document.getElementById('warmup-desc').textContent = step.desc;
    document.getElementById('warmup-instruction').textContent = step.instruction;
    document.getElementById('warmup-timer').textContent = '0:00';
    document.getElementById('warmup-progress-bar').style.setProperty('--progress', ((warmupStep + 1) / WARMUP_STEPS.length * 100) + '%');
    document.getElementById('warmup-step-label').textContent = `Paso ${warmupStep + 1} de ${WARMUP_STEPS.length}`;
    document.getElementById('warmup-prev-btn').disabled = warmupStep === 0;
}
function toggleWarmup() {
    if (!warmupRunning) {
        warmupRunning = true; warmupElapsed = 0;
        document.getElementById('warmup-toggle-btn').textContent = '⏸ Pausar';
        if (!isListening) startListening();
        playReferenceTone(WARMUP_STEPS[warmupStep].note);
        warmupTimer = setInterval(() => {
            warmupElapsed++;
            const m = Math.floor(warmupElapsed / 60), s = warmupElapsed % 60;
            document.getElementById('warmup-timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
            if (warmupElapsed >= WARMUP_STEPS[warmupStep].duration) stopWarmupStep();
        }, 1000);
    } else { stopWarmupStep(); }
}
function stopWarmupStep() {
    warmupRunning = false; clearInterval(warmupTimer); stopReferenceTone();
    document.getElementById('warmup-toggle-btn').textContent = '▶ Continuar';
}
function prevWarmupStep() { if (warmupStep > 0) { stopWarmupStep(); warmupStep--; updateWarmupUI(); } }
function nextWarmupStep() { if (warmupStep < WARMUP_STEPS.length - 1) { stopWarmupStep(); warmupStep++; updateWarmupUI(); } }

// ============================================================
// REFERENCE TONES
// ============================================================
let oscillator = null, gainNode = null;
function playReferenceTone(midi) {
    stopReferenceTone();
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const freq = midiToFreq(midi);
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}
function stopReferenceTone() {
    if (oscillator) {
        try {
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
            setTimeout(() => { try { oscillator.stop(); } catch {} oscillator = null; gainNode = null; }, 150);
        } catch { oscillator = null; gainNode = null; }
    }
}

// ============================================================
// ANALYSIS
// ============================================================
function updateAnalysisScreen() {
    document.getElementById('stat-sessions').textContent = stats.sessions;
    if (stats.accuracies.length > 0) {
        document.getElementById('stat-accuracy').textContent = Math.round(stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length) + '%';
    }
    document.getElementById('stat-best').textContent = stats.bestAccuracy + '%';
    document.getElementById('stat-range').textContent = stats.lowestNote && stats.highestNote ? `${stats.lowestNote} - ${stats.highestNote}` : '--';
    drawHistoryChart();
    updateTips();
}
function drawHistoryChart() {
    const canvas = document.getElementById('history-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let y = 0; y <= 4; y++) {
        const yPos = H - (y / 4) * (H - 40) - 20;
        ctx.beginPath(); ctx.moveTo(40, yPos); ctx.lineTo(W - 10, yPos); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
        ctx.fillText((y * 25) + '%', 35, yPos + 4);
    }

    const data = stats.accuracies.slice(-20);
    if (data.length < 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '14px Inter'; ctx.textAlign = 'center';
        ctx.fillText('Necesitas al menos 2 sesiones para ver el gráfico', W / 2, H / 2);
        return;
    }
    const padding = 50, graphW = W - padding - 10, graphH = H - 40;
    const stepX = graphW / (data.length - 1);

    const gradient = ctx.createLinearGradient(padding, 0, W - 10, 0);
    gradient.addColorStop(0, '#7c4dff'); gradient.addColorStop(1, '#e040fb');
    ctx.strokeStyle = gradient; ctx.lineWidth = 3; ctx.beginPath();
    data.forEach((val, i) => {
        const x = padding + i * stepX, y = H - 20 - (val / 100) * graphH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((val, i) => {
        const x = padding + i * stepX, y = H - 20 - (val / 100) * graphH;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = val >= 70 ? '#00e676' : val >= 50 ? '#ffc107' : '#ff5252';
        ctx.fill();
    });
}
function updateTips() {
    const tipEl = document.getElementById('personal-tips');
    const avg = stats.accuracies.length > 0 ? Math.round(stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length) : 0;
    let tips = '';
    if (stats.sessions === 0) {
        tips = '<p>💡 Comienza con al menos 5 sesiones para obtener consejos personalizados.</p><p>Calienta siempre antes de cantar, bebe agua tibia, y mantén buena postura.</p>';
    } else {
        if (avg < 50) tips = '<p>🎯 <strong>Enfoque en afinación:</strong> Prueba cantar más lento y mantén una nota a la vez.</p><p>👂 <strong>Escucha antes de cantar:</strong> Iguala la nota del tono de referencia.</p>';
        else if (avg < 75) tips = '<p>📈 <strong>Buen progreso:</strong> Vas mejorando. Prueba los arpegios y saltos de octava.</p><p>💧 <strong>Hidrátate:</strong> Bebe agua tibia durante las sesiones.</p>';
        else tips = '<p>🌟 <strong>¡Excelente nivel!</strong> Ya tienes buen control vocal.</p><p>🚀 Prueba los Estilos Musicales para aplicar tu técnica a géneros específicos.</p>';
    }
    tipEl.innerHTML = tips;
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎤 VocalCoach loaded');
    updateAnalysisScreen();
    updateStylesGrid();
});
