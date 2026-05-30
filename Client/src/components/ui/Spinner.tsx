const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const cls = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'
  return (
    <div className={`${cls} animate-spin rounded-full border-2 border-stone-300 border-t-amber-600`} />
  )
}

export default Spinner
