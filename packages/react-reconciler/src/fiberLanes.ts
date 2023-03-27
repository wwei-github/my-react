import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}
export function requestUpdateLane() {
	return SyncLane;
}

// 返回优先级最高的
export function getHighestPriorityLane(lanes: Lanes): Lane {
	// 0b00011
	// 返回 0b00001
	return lanes & -lanes;
}

// 删除lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}
