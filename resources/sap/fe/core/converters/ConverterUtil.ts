import { Placement, Positioning } from "./ManifestSettings";

const traversePositioning = (
	positioningItems: Record<string, Positioning>,
	anchor: string,
	sorted: string[],
	visited: Record<string, Positioning>
): number => {
	let insertIndex = sorted.indexOf(anchor);
	if (insertIndex !== -1) {
		return insertIndex;
	}
	let anchorItem: Positioning = positioningItems[anchor];
	if (anchorItem === undefined) {
		throw new Error("position anchor not found: " + anchor);
	}

	visited[anchor] = anchorItem;
	if (anchorItem.position && !(anchorItem.position.anchor in visited)) {
		insertIndex = traversePositioning(positioningItems, anchorItem.position.anchor, sorted, visited);
		if (anchorItem.position.placement !== Placement.Before) {
			++insertIndex;
		}
	} else {
		insertIndex = sorted.length;
	}

	sorted.splice(insertIndex, 0, anchor);
	return insertIndex;
};

export default {
	orderByPosition<T extends Positioning>(positioningItems: Record<string, T>): T[] {
		let sorted: string[] = [];

		for (let key in positioningItems) {
			traversePositioning(positioningItems, key, sorted, {});
		}

		return sorted.map(key => positioningItems[key]);
	}
};
