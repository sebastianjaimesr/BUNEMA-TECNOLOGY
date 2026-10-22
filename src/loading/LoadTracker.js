/**
 * Seguimiento VERIFICABLE de la carga.
 *
 * El progreso no es un temporizador: cada etapa suma su peso solo cuando
 * la tarea real termina (fuentes descargadas, módulo 3D descargado y
 * evaluado, escena creada, shaders compilados). Por eso la barra puede
 * avanzar a saltos: refleja trabajo hecho, no una animación inventada.
 *
 *   const tracker = new LoadTracker([{ id: 'fonts', label: 'Tipografías', weight: 1 }]);
 *   await tracker.run('fonts', () => document.fonts.ready);
 */
export class LoadTracker {
  constructor(steps) {
    this.steps = new Map(steps.map((step) => [step.id, { ...step, state: 'pending' }]));
    this.total = steps.reduce((sum, step) => sum + step.weight, 0);
    this.listeners = new Set();
    this.label = steps[0]?.label ?? '';
    this.failed = false;
    // `settled` se resuelve cuando todas las etapas terminan o una falla.
    this.settled = new Promise((resolve) => {
      this.resolveSettled = resolve;
    });
  }

  get progress() {
    let done = 0;
    this.steps.forEach((step) => {
      if (step.state === 'done') done += step.weight;
    });
    return this.total ? done / this.total : 1;
  }

  get complete() {
    return [...this.steps.values()].every((step) => step.state === 'done');
  }

  /** Etiqueta visible: la primera etapa que sigue en curso (no la última que empezó). */
  get currentLabel() {
    if (this.failed || this.complete) return this.label;
    const running = [...this.steps.values()].find((step) => step.state === 'running');
    return running ? running.label : this.label;
  }

  snapshot() {
    return { progress: this.progress, label: this.currentLabel, complete: this.complete, failed: this.failed };
  }

  onChange(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  emit() {
    const snap = this.snapshot();
    this.listeners.forEach((listener) => listener(snap));
    if (snap.complete) this.resolveSettled({ ok: true });
  }

  start(id) {
    const step = this.steps.get(id);
    if (!step || step.state !== 'pending') return;
    step.state = 'running';
    this.label = step.label;
    this.emit();
  }

  completeStep(id) {
    const step = this.steps.get(id);
    if (!step || step.state === 'done') return;
    step.state = 'done';
    if (this.complete) this.label = 'Listo';
    this.emit();
  }

  fail(error) {
    this.failed = true;
    this.label = 'Vista 3D no disponible';
    this.emit();
    this.resolveSettled({ ok: false, error });
  }

  /** Ejecuta una tarea dentro de una etapa y la marca como terminada al resolver. */
  async run(id, task) {
    this.start(id);
    const result = await (typeof task === 'function' ? task() : task);
    this.completeStep(id);
    return result;
  }
}
