/**
 * Interactive architecture diagram for the autonomous bug-resolution agent.
 *
 * Hand-authored SVG rather than a graph library: the layout is a deliberate
 * left-to-right flow (signals → reasoning → action) and carries meaning, so
 * a force simulation would actively make it worse by rearranging it.
 */

const NODES = [
  { id: 'telemetry', label: 'telemetry', x: 90,  y: 90,  kind: 'signal',
    title: 'Production telemetry',
    body: 'Metrics, traces and error rates streaming out of the platform. This is what the agent watches continuously — it is the trigger, not a dashboard someone has to remember to open.',
    tech: 'Grafana · Datadog · application logs' },
  { id: 'appdata', label: 'app data', x: 90,  y: 200, kind: 'signal',
    title: 'Application data',
    body: 'The connector state and job history that tells the agent what a failure actually means in business terms — which client, which pipeline, how far back it goes.',
    tech: 'PostgreSQL · MongoDB · BigQuery' },
  { id: 'events', label: 'event bus', x: 90,  y: 310, kind: 'signal',
    title: 'Event bus',
    body: 'Kafka topics carrying connector lifecycle events. Decouples detection from reaction, so the agent can process at its own pace without back-pressuring production.',
    tech: 'Apache Kafka' },

  { id: 'mcp', label: 'MCP tools', x: 260, y: 200, kind: 'bridge',
    title: 'MCP tool layer',
    body: 'Model Context Protocol servers exposing the platform to the model as typed tools — query the warehouse, read a trace, open a ticket. The model never gets raw credentials; the tool layer is the boundary.',
    tech: 'Model Context Protocol' },

  { id: 'graph', label: 'LangGraph', x: 430, y: 130, kind: 'brain',
    title: 'LangGraph orchestration',
    body: 'The state machine driving the loop: gather context, form a hypothesis, test it, and either act or escalate. Explicit graph rather than a free-running loop, so every run is traceable and bounded.',
    tech: 'LangGraph' },
  { id: 'claude', label: 'Claude', x: 430, y: 270, kind: 'brain',
    title: 'Reasoning',
    body: 'Claude does the part that was previously a senior engineer reading logs at 2am: correlate the symptom with recent changes, rank the likely causes, and say what it would do next.',
    tech: 'Claude' },

  { id: 'rca', label: 'root cause', x: 600, y: 130, kind: 'action',
    title: 'Root-cause analysis',
    body: 'A written diagnosis with the evidence attached. This alone removed most of the back-and-forth: the ticket arrives already explained rather than as "connector broken".',
    tech: 'structured output' },
  { id: 'fix', label: 'remediation', x: 600, y: 270, kind: 'action',
    title: 'Automated remediation',
    body: 'For known failure classes the agent applies the fix itself — replay, re-auth, re-sync. Anything novel is escalated with the analysis already done.',
    tech: 'Java · Kotlin · Spring Boot' },

  { id: 'outcome', label: '15–20d → hours', x: 760, y: 200, kind: 'outcome',
    title: 'The result',
    body: 'Bug resolution went from 15–20 days to a few hours, and product managers stopped being the relay between a customer complaint and an engineer. That gap was the real cost, not the fix itself.',
    tech: 'measured over production incidents' },
];

const EDGES = [
  ['telemetry', 'mcp'], ['appdata', 'mcp'], ['events', 'mcp'],
  ['mcp', 'graph'], ['mcp', 'claude'],
  ['graph', 'claude'], ['claude', 'graph'],
  ['graph', 'rca'], ['claude', 'fix'],
  ['rca', 'outcome'], ['fix', 'outcome'],
];

const KIND_COLOURS = {
  signal:  '#8AB4F8',
  bridge:  '#F0A868',
  brain:   '#5EE7C6',
  action:  '#5EE7C6',
  outcome: '#FFFFFF',
};

const KIND_LABELS = {
  signal: 'input signal',
  bridge: 'tool boundary',
  brain: 'reasoning',
  action: 'output',
  outcome: 'outcome',
};

const VIEWBOX = { width: 860, height: 400 };
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build the diagram and wire up interaction.
 *
 * @param {object} [options]
 * @param {boolean} [options.animate] When false, packets do not travel.
 */
export function initSysmap({ animate = true } = {}) {
  const stage = document.getElementById('sysmap-stage');
  const panel = document.getElementById('sysmap-panel');
  if (!stage || !panel) return;

  const byId = new Map(NODES.map((node) => [node.id, node]));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  drawEdges(svg, byId, animate);
  const groups = drawNodes(svg, panel, byId);
  stage.append(svg);

  // Open on the outcome node: the first thing a visitor should read is what
  // the system achieved, not the leftmost input.
  activate(groups, byId.get('outcome'), panel);
}

function drawEdges(svg, byId, animate) {
  EDGES.forEach(([fromId, toId], index) => {
    const from = byId.get(fromId);
    const to = byId.get(toId);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', curveBetween(from, to));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', KIND_COLOURS[to.kind]);
    path.setAttribute('stroke-width', '1');
    path.setAttribute('stroke-opacity', '0.22');
    svg.append(path);

    if (!animate) return;

    // A dot riding the path shows direction of flow, which a static arrowhead
    // conveys far less clearly on a dense diagram.
    const packet = document.createElementNS(SVG_NS, 'circle');
    packet.setAttribute('r', '2.4');
    packet.setAttribute('fill', KIND_COLOURS[to.kind]);
    packet.setAttribute('opacity', '0.9');

    const motion = document.createElementNS(SVG_NS, 'animateMotion');
    motion.setAttribute('dur', `${2.6 + (index % 4) * 0.55}s`);
    motion.setAttribute('repeatCount', 'indefinite');
    motion.setAttribute('begin', `${index * 0.33}s`);
    motion.setAttribute('path', curveBetween(from, to));
    packet.append(motion);
    svg.append(packet);
  });
}

function drawNodes(svg, panel, byId) {
  const groups = [];

  byId.forEach((node) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'sysnode');
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', node.title);

    const colour = KIND_COLOURS[node.kind];
    const radius = node.kind === 'outcome' ? 34 : 26;

    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('cx', node.x);
    halo.setAttribute('cy', node.y);
    halo.setAttribute('r', radius + 7);
    halo.setAttribute('fill', colour);
    halo.setAttribute('fill-opacity', '0.05');

    const disc = document.createElementNS(SVG_NS, 'circle');
    disc.setAttribute('cx', node.x);
    disc.setAttribute('cy', node.y);
    disc.setAttribute('r', radius);
    disc.setAttribute('fill', colour);
    disc.setAttribute('fill-opacity', '0.13');
    disc.setAttribute('stroke', colour);
    disc.setAttribute('stroke-opacity', '0.55');
    disc.setAttribute('stroke-width', '1');

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', node.x);
    label.setAttribute('y', node.y + radius + 15);
    label.textContent = node.label;

    group.append(halo, disc, label);

    const open = () => activate(groups, node, panel);
    group.addEventListener('mouseenter', open);
    group.addEventListener('focus', open);
    group.addEventListener('click', open);

    svg.append(group);
    groups.push({ group, node });
  });

  return groups;
}

/** Highlight one node and write its detail into the side panel. */
function activate(groups, node, panel) {
  groups.forEach(({ group, node: candidate }) => {
    group.classList.toggle('is-active', candidate.id === node.id);
  });

  panel.innerHTML = '';
  const heading = document.createElement('h3');
  heading.textContent = node.title;

  const kind = document.createElement('p');
  kind.className = 'sysmap__kind';
  kind.textContent = KIND_LABELS[node.kind];

  const body = document.createElement('p');
  body.textContent = node.body;

  const tech = document.createElement('div');
  tech.className = 'sysmap__tech';
  tech.textContent = node.tech;

  panel.append(heading, kind, body, tech);
}

/**
 * Cubic Bézier between two nodes, bulging horizontally.
 *
 * Horizontal control points make every edge read as left-to-right flow even
 * when the two nodes are at very different heights.
 */
function curveBetween(from, to) {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}
