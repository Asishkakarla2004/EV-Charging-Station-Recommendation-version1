const DataTable = ({ columns, rows, emptyMessage = 'No records available yet.' }) => {
  if (!rows.length) {
    return (
      <div className="app-panel-muted p-6 text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="app-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
          <thead className="bg-black/[0.03] dark:bg-white/[0.04]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/10">
            {rows.map((row, rowIndex) => (
              <tr key={row.id ?? rowIndex} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
