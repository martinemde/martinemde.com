<script lang="ts">
  let { message = 'Render failed' }: { message?: string } = $props();

  function fail(): never {
    throw new Error(message);
  }
</script>

<p>{fail()}</p>
