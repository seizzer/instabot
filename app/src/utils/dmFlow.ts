import { DmFlow, DmFlowButton, DmFlowNode } from '../types/models';

let counter = 0;
export function generateNodeId(): string {
  counter += 1;
  return `node_${Date.now()}_${counter}`;
}
export function generateButtonId(): string {
  counter += 1;
  return `btn_${Date.now()}_${counter}`;
}

export function updateNode(
  flow: DmFlow,
  nodeId: string,
  patch: Partial<DmFlowNode>
): DmFlow {
  const node = flow.nodes[nodeId];
  if (!node) return flow;
  return { ...flow, nodes: { ...flow.nodes, [nodeId]: { ...node, ...patch } } };
}

export function addButton(flow: DmFlow, nodeId: string): DmFlow {
  const node = flow.nodes[nodeId];
  if (!node || node.buttons.length >= 3) return flow;
  const newButton: DmFlowButton = {
    id: generateButtonId(),
    label: '',
    action: 'url',
    targetNodeId: null,
    url: '',
    fileUrl: null,
  };
  return updateNode(flow, nodeId, { buttons: [...node.buttons, newButton] });
}

export function updateButton(
  flow: DmFlow,
  nodeId: string,
  buttonId: string,
  patch: Partial<DmFlowButton>
): DmFlow {
  const node = flow.nodes[nodeId];
  if (!node) return flow;
  const buttons = node.buttons.map((b) => (b.id === buttonId ? { ...b, ...patch } : b));
  return updateNode(flow, nodeId, { buttons });
}

// Collects nodeId and all descendants reachable only through "reply" buttons.
function collectDescendants(flow: DmFlow, nodeId: string, acc: Set<string>) {
  acc.add(nodeId);
  const node = flow.nodes[nodeId];
  if (!node) return;
  for (const button of node.buttons) {
    if (button.action === 'reply' && button.targetNodeId) {
      collectDescendants(flow, button.targetNodeId, acc);
    }
  }
}

export function removeButton(flow: DmFlow, nodeId: string, buttonId: string): DmFlow {
  const node = flow.nodes[nodeId];
  if (!node) return flow;
  const button = node.buttons.find((b) => b.id === buttonId);
  let nodes = { ...flow.nodes };

  if (button?.action === 'reply' && button.targetNodeId) {
    const toRemove = new Set<string>();
    collectDescendants(flow, button.targetNodeId, toRemove);
    toRemove.forEach((id) => delete nodes[id]);
  }

  const buttons = node.buttons.filter((b) => b.id !== buttonId);
  nodes[nodeId] = { ...node, buttons };
  return { ...flow, nodes };
}

// Creates a new child text node and wires the given button's "reply" action to it.
export function addReplyNodeForButton(flow: DmFlow, nodeId: string, buttonId: string): DmFlow {
  const newNodeId = generateNodeId();
  const newNode: DmFlowNode = {
    id: newNodeId,
    type: 'text',
    text: '',
    mediaUrl: null,
    buttons: [],
  };
  const nodes = { ...flow.nodes, [newNodeId]: newNode };
  const flowWithNode = { ...flow, nodes };
  return updateButton(flowWithNode, nodeId, buttonId, {
    action: 'reply',
    targetNodeId: newNodeId,
  });
}
