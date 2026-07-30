<script lang="ts">
  let {
    open = $bindable(false),
    onInsert,
  }: { open?: boolean; onInsert: (value: string) => void } = $props();

  let dialogEl: HTMLDialogElement;
  let inputEl: HTMLInputElement;
  let value = $state('');

  $effect(() => {
    if (open && dialogEl && !dialogEl.open) {
      dialogEl.showModal();
      setTimeout(() => inputEl?.focus(), 40);
    } else if (!open && dialogEl?.open) {
      dialogEl.close();
    }
  });

  function insert() {
    const v = value.trim();
    if (v) onInsert(v);
    value = '';
    open = false;
  }

  function cancel() {
    value = '';
    open = false;
  }
</script>

<dialog bind:this={dialogEl} onclose={() => (open = false)}>
  <div class="dialog-body">
    <h2>단어 또는 짧은 표현 입력</h2>
    <input
      bind:this={inputEl}
      bind:value
      type="text"
      placeholder="예: 의존 ↑, 판단력 ↓, 그러나"
      maxlength="60"
      onkeydown={(e) => {
        if (e.key === 'Enter') insert();
      }}
    />
    <div class="dialog-actions">
      <button class="btn" type="button" onclick={cancel}>취소</button>
      <button class="btn primary" type="button" onclick={insert}>삽입</button>
    </div>
  </div>
</dialog>
