// 归 阶段
import {
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import { NoFlags } from './fiberFlags';
import { HostText, HostComponent, HostRoot } from './workTags';
export const completeWork = (wip: FiberNode) => {
	const current = wip.alternate;
	const newProps = wip.pendingProps; // 新的props

	switch (wip.tag) {
		case HostRoot:
			return;
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
			} else {
				// mount
				// instance : dom节点
				const instance = createInstance(wip.type, newProps);
				// 插入dom
				appendAllChild(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
			} else {
				// mount
				// instance : dom节点
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		default:
			if (__DEV__) {
				console.warn('未实现的completework');
			}
			bubbleProperties(wip);
			break;
	}
};
function appendAllChild(parent: FiberNode, wip: FiberNode) {
	let node = wip.child;
	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node?.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node?.return;
		}
		node.sibling.return = node;
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	let subTreeFlags = NoFlags;
	let child = wip.child;
	while (child !== null) {
		subTreeFlags |= child.subTreeFlags;
		subTreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	wip.subTreeFlags |= subTreeFlags;
}
