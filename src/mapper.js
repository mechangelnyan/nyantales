// ─────────────────────────────────────────────────────────────
// Story Map — ASCII graph visualization of story scene flow
// ─────────────────────────────────────────────────────────────

/**
 * Analyze a parsed story and return a structured graph representation.
 *
 * @param {object} story - Parsed story object with scenes, start, title
 * @returns {{ nodes: Map, edges: Array, stats: object }}
 */
export function analyzeStoryGraph(story) {
  const scenes = story.scenes || {};
  const nodes = new Map();
  const edges = [];

  // Build nodes
  for (const [id, scene] of Object.entries(scenes)) {
    const choiceCount = (scene.choices || []).length;
    const isEnding = !!scene.is_ending;
    const endingType = scene.ending_type || (isEnding ? 'neutral' : null);
    const hasMood = !!scene.mood;
    const hasArt = !!scene.art;
    const hasConditional = Array.isArray(scene.conditional) && scene.conditional.length > 0;
    const hasFallback = !!scene.fallback_goto;

    nodes.set(id, {
      id,
      isEnding,
      endingType,
      choiceCount,
      hasMood,
      mood: scene.mood || null,
      hasArt,
      hasConditional,
      hasFallback,
      isStart: id === story.start,
      inDegree: 0,
      outDegree: 0,
    });
  }

  // Build edges from choices
  for (const [sourceId, scene] of Object.entries(scenes)) {
    const choices = scene.choices || [];
    for (const choice of choices) {
      if (choice.goto) {
        const hasCondition = !!(
          choice.requires_flag || choice.requires_not_flag ||
          choice.requires_item || choice.requires_no_item ||
          choice.requires_visited || choice.requires_items ||
          choice.condition
        );
        edges.push({
          from: sourceId,
          to: choice.goto,
          label: choice.label || '',
          conditional: hasCondition,
        });
        if (nodes.has(sourceId)) nodes.get(sourceId).outDegree++;
        if (nodes.has(choice.goto)) nodes.get(choice.goto).inDegree++;
      }
    }
    // Fallback goto
    if (scene.fallback_goto) {
      edges.push({
        from: sourceId,
        to: scene.fallback_goto,
        label: '(fallback)',
        conditional: true,
      });
      if (nodes.has(sourceId)) nodes.get(sourceId).outDegree++;
      if (nodes.has(scene.fallback_goto)) nodes.get(scene.fallback_goto).inDegree++;
    }
  }

  // Compute reachability from start via BFS
  const reachable = new Set();
  if (story.start && nodes.has(story.start)) {
    const queue = [story.start];
    reachable.add(story.start);
    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of edges) {
        if (edge.from === current && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
  }

  // Stats
  const endingNodes = [...nodes.values()].filter(n => n.isEnding);
  const stats = {
    totalScenes: nodes.size,
    reachableScenes: reachable.size,
    unreachableScenes: nodes.size - reachable.size,
    totalEdges: edges.length,
    conditionalEdges: edges.filter(e => e.conditional).length,
    endings: {
      total: endingNodes.length,
      good: endingNodes.filter(n => n.endingType === 'good').length,
      bad: endingNodes.filter(n => n.endingType === 'bad').length,
      neutral: endingNodes.filter(n => n.endingType === 'neutral').length,
      secret: endingNodes.filter(n => n.endingType === 'secret').length,
    },
    hubScenes: [...nodes.values()]
      .filter(n => n.outDegree >= 3)
      .sort((a, b) => b.outDegree - a.outDegree)
      .map(n => ({ id: n.id, outDegree: n.outDegree })),
    deadEnds: [...nodes.values()]
      .filter(n => n.outDegree === 0 && !n.isEnding)
      .map(n => n.id),
  };

  return { nodes, edges, reachable, stats, start: story.start };
}

/**
 * Generate a layered ASCII map of the story graph.
 * Uses BFS layering from the start scene.
 *
 * @param {object} graph - Output from analyzeStoryGraph
 * @returns {string} ASCII representation
 */
export function renderAsciiMap(graph) {
  const { nodes, edges, start } = graph;
  const lines = [];

  // BFS layering
  const layers = [];
  const visited = new Set();
  const nodeLayer = new Map();

  if (start && nodes.has(start)) {
    let frontier = [start];
    visited.add(start);

    while (frontier.length > 0) {
      layers.push([...frontier]);
      for (const id of frontier) nodeLayer.set(id, layers.length - 1);
      const next = [];
      for (const id of frontier) {
        for (const edge of edges) {
          if (edge.from === id && !visited.has(edge.to) && nodes.has(edge.to)) {
            visited.add(edge.to);
            next.push(edge.to);
          }
        }
      }
      frontier = next;
    }
  }

  // Add unreachable nodes as a final layer
  const unreachable = [...nodes.keys()].filter(id => !visited.has(id));
  if (unreachable.length > 0) {
    layers.push(unreachable);
    for (const id of unreachable) nodeLayer.set(id, layers.length - 1);
  }

  // Render node symbol
  function nodeSymbol(node) {
    if (node.isStart) return '▶';
    if (node.isEnding) {
      const icons = { good: '✦', bad: '✗', neutral: '◇', secret: '★' };
      return icons[node.endingType] || '◇';
    }
    if (node.outDegree >= 3) return '◈'; // hub
    return '○';
  }

  function nodeDecor(node) {
    const parts = [];
    if (node.hasMood) parts.push(node.mood);
    if (node.hasArt) parts.push('art');
    if (node.hasConditional) parts.push('cond');
    return parts.length > 0 ? ` [${parts.join(',')}]` : '';
  }

  // Render
  lines.push('');
  lines.push('  STORY MAP');
  lines.push('  ─────────');
  lines.push('');
  lines.push('  Legend: ▶ start  ○ scene  ◈ hub (3+ exits)');
  lines.push('          ✦ good end  ✗ bad end  ◇ neutral end  ★ secret end');
  lines.push('          ─→ choice  ╌→ conditional choice');
  lines.push('');

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const isUnreachable = unreachable.length > 0 && i === layers.length - 1 && layer === unreachable;

    if (isUnreachable) {
      lines.push('  ⚠ Unreachable scenes:');
    } else {
      lines.push(`  Layer ${i}:`);
    }

    for (const id of layer) {
      const node = nodes.get(id);
      const sym = nodeSymbol(node);
      const decor = nodeDecor(node);
      const label = `    ${sym} ${id}${decor}`;

      // Show outgoing edges
      const outEdges = edges.filter(e => e.from === id);
      if (outEdges.length === 0 && !node.isEnding) {
        lines.push(`${label}  (dead end)`);
      } else if (node.isEnding) {
        const typeLabel = node.endingType ? ` (${node.endingType})` : '';
        lines.push(`${label}  ── END${typeLabel}`);
      } else {
        lines.push(label);
        for (const edge of outEdges) {
          const arrow = edge.conditional ? '╌→' : '─→';
          const truncLabel = edge.label.length > 40
            ? edge.label.substring(0, 37) + '...'
            : edge.label;
          lines.push(`      ${arrow} ${edge.to}  "${truncLabel}"`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Find one shortest path from start to each ending using targeted BFS,
 * plus additional DFS paths up to a budget.
 *
 * @param {object} graph - Output from analyzeStoryGraph
 * @param {{ maxPathsPerEnding?: number, maxDepth?: number }} opts
 * @returns {Array<{ ending: string, type: string, path: string[], length: number }>}
 */
export function findEndingPaths(graph, opts = {}) {
  const { nodes, edges, start } = graph;
  const maxPathsPerEnding = opts.maxPathsPerEnding ?? 3;
  const maxDepth = opts.maxDepth ?? 80;
  const results = [];

  if (!start || !nodes.has(start)) return results;

  // Build adjacency list
  const adj = new Map();
  for (const [id] of nodes) adj.set(id, []);
  for (const edge of edges) {
    if (adj.has(edge.from)) {
      adj.get(edge.from).push(edge.to);
    }
  }

  // Get all endings
  const endingIds = [...nodes.values()]
    .filter(n => n.isEnding)
    .map(n => n.id);

  // For each ending, find shortest path via BFS, then a few more via DFS
  for (const targetEnding of endingIds) {
    const endingPaths = [];

    // BFS for shortest path
    const bfsQueue = [[start]];
    const bfsVisited = new Set([start]);
    let found = false;

    while (bfsQueue.length > 0 && !found) {
      const path = bfsQueue.shift();
      if (path.length > maxDepth) continue;
      const current = path[path.length - 1];

      const neighbors = adj.get(current) || [];
      for (const next of neighbors) {
        if (next === targetEnding) {
          const fullPath = [...path, next];
          endingPaths.push({
            ending: targetEnding,
            type: nodes.get(targetEnding).endingType || 'neutral',
            path: fullPath,
            length: fullPath.length,
          });
          found = true;
          break;
        }
        if (!bfsVisited.has(next) && !nodes.get(next)?.isEnding) {
          bfsVisited.add(next);
          bfsQueue.push([...path, next]);
        }
      }
    }

    // DFS for additional paths (if requested)
    if (maxPathsPerEnding > 1 && found) {
      const dfsResults = [];

      function dfs(current, path, visited) {
        if (dfsResults.length >= maxPathsPerEnding - 1) return;
        if (path.length > maxDepth) return;

        const neighbors = adj.get(current) || [];
        for (const next of neighbors) {
          if (next === targetEnding) {
            const fullPath = [...path, next];
            // Don't add duplicates of the BFS path
            const pathKey = fullPath.join('→');
            const existingKeys = endingPaths.map(p => p.path.join('→'));
            if (!existingKeys.includes(pathKey)) {
              dfsResults.push({
                ending: targetEnding,
                type: nodes.get(targetEnding).endingType || 'neutral',
                path: fullPath,
                length: fullPath.length,
              });
            }
          } else if (!visited.has(next) && !nodes.get(next)?.isEnding) {
            visited.add(next);
            path.push(next);
            dfs(next, path, visited);
            path.pop();
            visited.delete(next);
          }
        }
      }

      const visited = new Set([start]);
      dfs(start, [start], visited);
      endingPaths.push(...dfsResults);
    }

    results.push(...endingPaths);
  }

  // Sort: by ending type priority, then shortest paths first
  const typePriority = { secret: 0, good: 1, bad: 2, neutral: 3 };
  results.sort((a, b) => {
    const tp = (typePriority[a.type] ?? 4) - (typePriority[b.type] ?? 4);
    if (tp !== 0) return tp;
    return a.length - b.length;
  });

  return results;
}

/**
 * Render ending paths as readable text.
 */
export function renderEndingPaths(paths, opts = {}) {
  const maxShow = opts.maxShow ?? 20;
  const lines = [];

  lines.push('');
  lines.push('  PATHS TO ENDINGS');
  lines.push('  ────────────────');
  lines.push('');

  if (paths.length === 0) {
    lines.push('  No paths found from start to any ending.');
    return lines.join('\n');
  }

  // Group by ending
  const byEnding = new Map();
  for (const p of paths) {
    if (!byEnding.has(p.ending)) byEnding.set(p.ending, []);
    byEnding.get(p.ending).push(p);
  }

  const icons = { good: '✦', bad: '✗', neutral: '◇', secret: '★' };
  let shown = 0;

  for (const [ending, epaths] of byEnding) {
    if (shown >= maxShow) {
      lines.push(`  ... and ${paths.length - shown} more paths`);
      break;
    }

    const icon = icons[epaths[0].type] || '◇';
    lines.push(`  ${icon} ${ending} (${epaths[0].type}) — ${epaths.length} path${epaths.length !== 1 ? 's' : ''}`);

    // Show shortest path
    const shortest = epaths[0];
    const pathStr = shortest.path.join(' → ');
    if (pathStr.length <= 100) {
      lines.push(`    Shortest (${shortest.length} steps): ${pathStr}`);
    } else {
      // Truncate middle
      const first3 = shortest.path.slice(0, 3).join(' → ');
      const last2 = shortest.path.slice(-2).join(' → ');
      lines.push(`    Shortest (${shortest.length} steps): ${first3} → ... → ${last2}`);
    }
    lines.push('');
    shown++;
  }

  return lines.join('\n');
}
