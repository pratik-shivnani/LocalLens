import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import GalleryPage from './pages/GalleryPage'
import SearchPage from './pages/SearchPage'
import PeoplePage from './pages/PeoplePage'
import ImportPage from './pages/ImportPage'
import SettingsPage from './pages/SettingsPage'
import AlbumsPage from './pages/AlbumsPage'
import AlbumDetailPage from './pages/AlbumDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<GalleryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:id" element={<AlbumDetailPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
