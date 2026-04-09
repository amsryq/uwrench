import {
	SETTINGS_SCHEMA_VERSION,
	type SettingsEnvelope,
} from "./settings-types";
import {
	clearableStorageItems,
	getDefaultEnvelope,
	settingsItem,
} from "../storage/items";

const RAW_SETTINGS_KEY = "uwrench:settings";

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeEnvelope(raw: unknown): SettingsEnvelope {
	if (!isObject(raw)) return getDefaultEnvelope();

	const schemaVersion =
		typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
	const features = isObject(raw.features)
		? (raw.features as Record<string, any>)
		: {};
	const updatedAt =
		typeof raw.updatedAt === "string" ? raw.updatedAt : undefined;

	return {
		schemaVersion,
		updatedAt,
		features,
	};
}

export async function loadSettings(): Promise<SettingsEnvelope> {
	return normalizeEnvelope(await settingsItem.getValue());
}

export async function saveSettings(next: SettingsEnvelope): Promise<void> {
	await settingsItem.setValue({
		...next,
		updatedAt: new Date().toISOString(),
	});
}

export async function updateSettings(
	updater: (
		current: SettingsEnvelope,
	) => SettingsEnvelope | Promise<SettingsEnvelope>,
): Promise<SettingsEnvelope> {
	const current = await loadSettings();
	const next = await updater(current);
	await saveSettings(next);
	return next;
}

export async function setFeatureEnabled(
	featureId: string,
	enabled: boolean,
): Promise<void> {
	await updateSettings((current) => {
		const prev = current.features[featureId] ?? {};
		return {
			...current,
			features: {
				...current.features,
				[featureId]: {
					...prev,
					enabled,
				},
			},
		};
	});
}

export async function setSubFeatureEnabled(
	featureId: string,
	subFeatureId: string,
	enabled: boolean,
): Promise<void> {
	await updateSettings((current) => {
		const prev = current.features[featureId] ?? {};
		const prevSub = prev.sub ?? {};
		const prevSubState = prevSub[subFeatureId] ?? {};

		return {
			...current,
			features: {
				...current.features,
				[featureId]: {
					...prev,
					sub: {
						...prevSub,
						[subFeatureId]: {
							...prevSubState,
							enabled,
						},
					},
				},
			},
		};
	});
}

export async function setFeatureOptions(
	featureId: string,
	options: unknown,
): Promise<void> {
	await updateSettings((current) => {
		const prev = current.features[featureId] ?? {};
		return {
			...current,
			features: {
				...current.features,
				[featureId]: {
					...prev,
					options,
				},
			},
		};
	});
}

export async function setSubFeatureOptions(
	featureId: string,
	subFeatureId: string,
	options: unknown,
): Promise<void> {
	await updateSettings((current) => {
		const prev = current.features[featureId] ?? {};
		const prevSub = prev.sub ?? {};
		const prevSubState = prevSub[subFeatureId] ?? {};

		return {
			...current,
			features: {
				...current.features,
				[featureId]: {
					...prev,
					sub: {
						...prevSub,
						[subFeatureId]: {
							...prevSubState,
							options,
						},
					},
				},
			},
		};
	});
}

export type SettingsWatcher = (
	next: SettingsEnvelope,
	prev: SettingsEnvelope,
) => void;

export function watchSettings(watcher: SettingsWatcher): () => void {
	const unwatch = settingsItem.watch((next, prev) => {
		watcher(
			normalizeEnvelope(next),
			normalizeEnvelope(prev ?? getDefaultEnvelope()),
		);
	});

	return () => {
		unwatch();
	};
}

export function getRawSettingsKey(): string {
	return RAW_SETTINGS_KEY;
}

export async function clearAllStorage(): Promise<void> {
	await Promise.all(clearableStorageItems.map(({ reset }) => reset()));
}
