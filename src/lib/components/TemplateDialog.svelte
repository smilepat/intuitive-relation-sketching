<script lang="ts">
  import { templates } from '../templates';

  let {
    open = $bindable(false),
    suggestedId = 'cause',
    onInsert,
  }: {
    open?: boolean;
    suggestedId?: string;
    onInsert: (id: string, values: Record<string, string>) => void;
  } = $props();

  let dialogEl: HTMLDialogElement;
  let selectedId = $state('cause');
  let values = $state<Record<string, string>>({});

  const selected = $derived(templates.find((t) => t.id === selectedId) ?? templates[0]);

  $effect(() => {
    if (open && dialogEl && !dialogEl.open) {
      selectedId = templates.some((t) => t.id === suggestedId) ? suggestedId : templates[0].id;
      values = {};
      dialogEl.showModal();
    } else if (!open && dialogEl?.open) {
      dialogEl.close();
    }
  });

  function pick(id: string) {
    selectedId = id;
    values = {};
  }

  function insert() {
    onInsert(selectedId, { ...values });
    open = false;
  }

  function cancel() {
    open = false;
  }
</script>

<dialog bind:this={dialogEl} onclose={() => (open = false)}>
  <div class="dialog-body">
    <h2>관계 템플릿</h2>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
      {#each templates as t (t.id)}
        <button class="btn small" class:primary={selectedId === t.id} type="button" onclick={() => pick(t.id)}>
          {t.title}
        </button>
      {/each}
    </div>
    <p style="font-size:13px;color:var(--muted);margin:0 0 12px">{selected.hint}</p>
    {#each selected.slots as slot (slot.key)}
      <label for={'slot-' + slot.key}>{slot.label}</label>
      <input
        id={'slot-' + slot.key}
        type="text"
        maxlength="40"
        placeholder={slot.placeholder ?? ''}
        bind:value={values[slot.key]}
        style="margin-bottom:10px"
      />
    {/each}
    <div class="dialog-actions">
      <button class="btn" type="button" onclick={cancel}>취소</button>
      <button class="btn primary" type="button" onclick={insert}>삽입</button>
    </div>
  </div>
</dialog>
