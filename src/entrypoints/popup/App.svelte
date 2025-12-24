<script lang="ts">
  import { onMount } from "svelte";
  import type { SettingsEnvelope } from "../../lib/settings/settings-types";
  import type { FeatureDef } from "../../lib/runtime/types";
  import { allFeatures } from "../../lib/features/manifest";
  import {
    loadSettings,
    setFeatureEnabled,
    setSubFeatureEnabled,
    watchSettings,
    clearAllStorage,
  } from "../../lib/settings/settings-store";

  let settings: SettingsEnvelope | null = null;

  onMount(() => {
    let stop: (() => void) | null = null;

    const init = async () => {
      settings = await loadSettings();
      stop = watchSettings((next) => {
        settings = next;
      });
    };

    void init();

    return () => {
      stop?.();
    };
  });

  function featureEnabled(def: FeatureDef): boolean {
    const stored = settings?.features?.[def.id];
    return stored?.enabled ?? def.defaults.enabled;
  }

  function subFeatureEnabled(def: FeatureDef, subId: string): boolean {
    const stored = settings?.features?.[def.id];
    const subStored = stored?.sub?.[subId];
    const subDef: any = (def.subFeatures as any)?.[subId];
    return subStored?.enabled ?? subDef?.defaults?.enabled ?? false;
  }

  async function onToggleFeature(def: FeatureDef, e: Event) {
    const enabled = (e.target as HTMLInputElement).checked;
    await setFeatureEnabled(def.id, enabled);
  }

  async function onToggleSubFeature(def: FeatureDef, subId: string, e: Event) {
    const enabled = (e.target as HTMLInputElement).checked;
    await setSubFeatureEnabled(def.id, subId, enabled);
  }

  async function onClearData(def: FeatureDef) {
    await def.clearData?.();
  }

  async function onClearAll() {
    if (
      confirm(
        "⚠️ This will wipe ALL extension data and settings. Are you sure?",
      )
    ) {
      await clearAllStorage();
      // Reload settings to reflect cleared state
      settings = await loadSettings();
    }
  }
</script>

<main>
  <div class="header">
    <h1>uwrench</h1>
    <button type="button" class="btn btn-danger" on:click={onClearAll}>
      Clear All
    </button>
  </div>
  <p class="hint">
    Disabling a feature stops it from running. Data persists unless you clear
    it.
  </p>

  {#if !settings}
    <div class="hint">Loading settings…</div>
  {:else}
    <div class="list">
      {#each allFeatures as def (def.id)}
        <div class="item">
          <div class="row">
            <label class="label">
              <input
                type="checkbox"
                checked={featureEnabled(def)}
                on:change={(e) => onToggleFeature(def, e)}
              />
              <span class="title">{def.title}</span>
            </label>

            {#if def.clearData}
              <button
                type="button"
                class="btn"
                on:click={() => onClearData(def)}
              >
                Clear data
              </button>
            {/if}
          </div>

          {#if def.description}
            <div class="desc">{def.description}</div>
          {/if}

          {#if def.restartRequired}
            <div class="hint">Restart required to fully apply changes.</div>
          {/if}

          {#if def.subFeatures}
            <div class="sub">
              {#each Object.keys(def.subFeatures) as subId (subId)}
                <label class="subLabel">
                  <input
                    type="checkbox"
                    disabled={!featureEnabled(def)}
                    checked={subFeatureEnabled(def, subId)}
                    on:change={(e) => onToggleSubFeature(def, subId, e)}
                  />
                  <span>
                    {(def.subFeatures as any)[subId].title}
                  </span>
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  .hint {
    font-size: 0.85rem;
    opacity: 0.75;
    margin: 0 0 10px;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .item {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-weight: 600;
  }

  .desc {
    margin-top: 6px;
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .sub {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-left: 22px;
  }

  .subLabel {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }

  .btn {
    font-size: 0.85rem;
    padding: 6px 10px;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-danger:hover {
    background-color: #c82333;
  }
</style>
