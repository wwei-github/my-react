// 同步回掉函数队列
let syncQueue: ((...args: any) => void)[] | null = null;
let isFlushingSyncQueue = false;

// 调度，将更新放到数组里
export function scheduleSyncCallback(callback: (...args: any) => void) {
	if (syncQueue === null) {
		syncQueue = [callback];
	} else {
		syncQueue.push(callback);
	}
}

// 执行数组的更新回掉
export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((callback) => callback());
		} catch (e) {
			if (__DEV__) {
				console.error('flushSyncCallbacks报错');
			}
		} finally {
			syncQueue = null;
			isFlushingSyncQueue = false;
		}
	}
}
