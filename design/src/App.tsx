import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    const appUrl = new URL('dwelly.min.html', window.location.href)

    if (window.location.href !== appUrl.href) {
      window.location.replace(appUrl.href)
    }
  }, [])

  return null
}
