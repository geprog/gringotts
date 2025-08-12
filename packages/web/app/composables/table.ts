import type { Column } from '@tanstack/vue-table';

export function useTable() {
  const UButton = resolveComponent('UButton');

  function getSortableHeader(column: Column<any>, label: string) {
    const isSorted = column.getIsSorted();

    function handleClick() {
      if (isSorted === 'asc') {
        column.toggleSorting(true); // go to desc
      } else if (isSorted === 'desc') {
        column.clearSorting(); // go to unsorted
      } else {
        column.toggleSorting(false); // go to asc
      }
    }

    return h(
      UButton,
      {
        color: 'neutral',
        variant: 'ghost',
        label,
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        'aria-label': `Sort by ${isSorted === 'asc' ? 'descending' : isSorted === 'desc' ? 'unsorted' : 'ascending'}`,
        onClick: handleClick,
      }
    );
  }
  return {
    getSortableHeader,
  };
}
