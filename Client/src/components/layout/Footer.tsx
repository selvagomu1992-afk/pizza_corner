import useSettings from '../../hooks/useSettings'

const Footer = () => {
  const { settings } = useSettings()
  return (
    <footer className="bg-stone-800 text-stone-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-lg mb-1">
          {settings.logo ? <img src={settings.logo} alt="" className="h-6 w-auto inline-block mr-2" /> : <span className="mr-2">🍕</span>}
          {settings.companyName}
        </p>
        <p className="text-sm">Hot & fresh pizza delivered to your door</p>
        <p className="text-xs mt-4">&copy; {new Date().getFullYear()} {settings.companyName}. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
