import { useEffect, useMemo, useState } from 'react'
import { CarFront, Search, Plus, LogOut, Gauge, ShieldCheck, RefreshCw, X, CheckCircle2, AlertCircle, SlidersHorizontal } from 'lucide-react'
import { request } from './api'

const blankVehicle = { make: '', model: '', category: 'SUV', price: '', quantity: '', year: '', description: '', image_url: '' }
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('drivelux-session')) } catch { return null }
  })
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({ make: '', model: '', category: '', min_price: '', max_price: '' })
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [vehicleForm, setVehicleForm] = useState(blankVehicle)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const isAdmin = session?.user?.role === 'admin'
  const token = session?.access_token

  function flash(message, kind = 'success') {
    setNotice({ message, kind })
    window.setTimeout(() => setNotice(null), 3800)
  }

  async function loadVehicles(activeFilters = filters) {
    if (!token) return
    try {
      const params = new URLSearchParams()
      Object.entries(activeFilters).forEach(([key, value]) => { if (value !== '') params.set(key, value) })
      const hasFilters = [...params.keys()].length > 0
      const data = await request(`/api/vehicles${hasFilters ? `/search?${params}` : ''}`, { token })
      setVehicles(data)
    } catch (error) {
      flash(error.message, 'error')
    }
  }

  useEffect(() => { if (token) loadVehicles() }, [token])

  async function authenticate(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const user = await request(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify({ email, password })
      })
      if (mode === 'register') {
        flash('Account created. Please sign in.')
        setMode('login')
      } else {
        const next = { ...user }
        localStorage.setItem('drivelux-session', JSON.stringify(next))
        setSession(next)
        flash('Welcome to DriveLux.')
      }
    } catch (error) { flash(error.message, 'error') }
    finally { setBusy(false) }
  }

  function logout() {
    localStorage.removeItem('drivelux-session')
    setSession(null)
    setVehicles([])
    flash('You have signed out.')
  }

  function openCreate() {
    setEditing(null); setVehicleForm(blankVehicle); setShowForm(true)
  }
  function openEdit(vehicle) {
    setEditing(vehicle.id)
    setVehicleForm({ ...vehicle, price: String(vehicle.price), quantity: String(vehicle.quantity), year: vehicle.year ? String(vehicle.year) : '' })
    setShowForm(true)
  }

  async function saveVehicle(event) {
    event.preventDefault()
    const body = { ...vehicleForm, price: Number(vehicleForm.price), quantity: Number(vehicleForm.quantity), year: vehicleForm.year ? Number(vehicleForm.year) : null }
    setBusy(true)
    try {
      await request(editing ? `/api/vehicles/${editing}` : '/api/vehicles', {
        method: editing ? 'PUT' : 'POST', token, body: JSON.stringify(body)
      })
      setShowForm(false)
      flash(editing ? 'Vehicle updated.' : 'Vehicle added to inventory.')
      await loadVehicles()
    } catch (error) { flash(error.message, 'error') }
    finally { setBusy(false) }
  }

  async function purchase(vehicle) {
    try {
      const updated = await request(`/api/vehicles/${vehicle.id}/purchase`, { method: 'POST', token, body: JSON.stringify({ quantity: 1 }) })
      setVehicles(old => old.map(item => item.id === updated.id ? updated : item))
      flash(`${vehicle.make} ${vehicle.model} purchase recorded.`)
    } catch (error) { flash(error.message, 'error') }
  }

  async function restock(vehicle) {
    const raw = window.prompt(`How many ${vehicle.make} ${vehicle.model} units should be added?`, '1')
    if (raw === null) return
    const quantity = Number(raw)
    if (!Number.isInteger(quantity) || quantity <= 0) return flash('Enter a positive whole number.', 'error')
    try {
      const updated = await request(`/api/vehicles/${vehicle.id}/restock`, { method: 'POST', token, body: JSON.stringify({ quantity }) })
      setVehicles(old => old.map(item => item.id === updated.id ? updated : item))
      flash('Inventory restocked.')
    } catch (error) { flash(error.message, 'error') }
  }

  async function deleteVehicle(vehicle) {
    if (!window.confirm(`Delete ${vehicle.make} ${vehicle.model}? This cannot be undone.`)) return
    try {
      await request(`/api/vehicles/${vehicle.id}`, { method: 'DELETE', token })
      setVehicles(old => old.filter(item => item.id !== vehicle.id))
      flash('Vehicle deleted.')
    } catch (error) { flash(error.message, 'error') }
  }

  const stats = useMemo(() => ({
    models: vehicles.length,
    units: vehicles.reduce((sum, v) => sum + v.quantity, 0),
    value: vehicles.reduce((sum, v) => sum + v.price * v.quantity, 0)
  }), [vehicles])

  if (!session) return (
    <main className="auth-shell">
      <section className="auth-art">
        <div className="brand"><span className="brand-mark"><CarFront size={24}/></span> DRIVELUX</div>
        <div className="auth-copy">
          <span className="eyebrow">THE ART OF THE DRIVE</span>
          <h1>Find your next<br/><em>great drive.</em></h1>
          <p>A considered collection of exceptional vehicles, ready for the road ahead.</p>
          <div className="art-stat"><span className="stat-line"></span><span>DISCOVER. DRIVE. REPEAT.</span></div>
        </div>
        <div className="art-car" aria-hidden="true"><div className="car-roof"/><div className="car-body"/><div className="wheel wheel-one"/><div className="wheel wheel-two"/></div>
        <span className="art-caption">DRIVE YOUR OWN STORY</span>
      </section>
      <section className="auth-panel">
        <div className="mobile-brand brand"><span className="brand-mark"><CarFront size={22}/></span> DRIVELUX</div>
        <div className="auth-form-wrap">
          <span className="eyebrow muted">{mode === 'login' ? 'WELCOME BACK' : 'YOUR JOURNEY STARTS HERE'}</span>
          <h2>{mode === 'login' ? 'Sign in to DriveLux' : 'Create your account'}</h2>
          <p className="subcopy">{mode === 'login' ? 'Enter your details to access the dealership.' : 'Join us to explore and purchase available vehicles.'}</p>
          <form onSubmit={authenticate} className="form-stack">
            <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
            <label>Password<input type="password" required minLength={mode === 'register' ? 8 : 1} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></label>
            <button className="primary-btn full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>↗</span></button>
          </form>
          <div className="switch-auth">{mode === 'login' ? 'New to DriveLux?' : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div>
          <div className="secure-note"><ShieldCheck size={16}/> Secure access protected by encrypted authentication</div>
        </div>
        <footer>© 2026 DRIVELUX <span>BUILT FOR THE ROAD AHEAD</span></footer>
      </section>
      {notice && <Toast notice={notice}/>}
    </main>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand dark-brand" href="#"><span className="brand-mark"><CarFront size={23}/></span> DRIVELUX</a>
        <nav className="topnav"><span className="nav-active">Inventory</span><span>Discover</span></nav>
        <div className="user-actions"><div className="user-avatar">{session.user.email.slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{session.user.email.split('@')[0]}</strong><small>{isAdmin ? 'Administrator' : 'Dealership member'}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={18}/></button></div>
      </header>
      <main className="dashboard">
        <section className="welcome-row">
          <div><span className="eyebrow muted">DRIVELUX / INVENTORY</span><h1>Find your <em>next drive.</em></h1><p>Explore the collection. Your next chapter starts here.</p></div>
          <div className="welcome-actions"><button className="outline-btn" onClick={() => loadVehicles()}><RefreshCw size={16}/> Refresh</button>{isAdmin && <button className="primary-btn" onClick={openCreate}><Plus size={17}/> Add vehicle</button>}</div>
        </section>
        <section className="stats-grid">
          <Stat icon={<CarFront size={20}/>} label="VEHICLE MODELS" value={stats.models} detail="In current results"/>
          <Stat icon={<Gauge size={20}/>} label="UNITS IN STOCK" value={stats.units} detail="Available inventory"/>
          <Stat icon={<span className="rupee">₹</span>} label="INVENTORY VALUE" value={money(stats.value)} detail="Based on current stock"/>
        </section>
        <section className="filter-panel">
          <div className="filter-heading"><div><SlidersHorizontal size={18}/><strong>Find your vehicle</strong></div><span>REFINE THE COLLECTION</span></div>
          <form className="filters" onSubmit={e => { e.preventDefault(); loadVehicles(filters) }}>
            <label className="search-field"><Search size={17}/><input placeholder="Search make" value={filters.make} onChange={e => setFilters({...filters, make:e.target.value})}/></label>
            <label><input placeholder="Model" value={filters.model} onChange={e => setFilters({...filters, model:e.target.value})}/></label>
            <label><select value={filters.category} onChange={e => setFilters({...filters, category:e.target.value})}><option value="">All categories</option><option>SUV</option><option>Sedan</option><option>Hatchback</option><option>Coupe</option><option>Luxury</option><option>Electric</option><option>Pickup</option></select></label>
            <label><input type="number" min="0" placeholder="Min price ₹" value={filters.min_price} onChange={e => setFilters({...filters, min_price:e.target.value})}/></label>
            <label><input type="number" min="0" placeholder="Max price ₹" value={filters.max_price} onChange={e => setFilters({...filters, max_price:e.target.value})}/></label>
            <button className="primary-btn filter-submit">Search <span>↗</span></button>
            <button type="button" className="clear-btn" onClick={() => { const cleared={make:'',model:'',category:'',min_price:'',max_price:''}; setFilters(cleared); loadVehicles(cleared) }}>Clear</button>
          </form>
        </section>
        <section className="inventory-heading"><div><span className="eyebrow muted">CURATED FOR YOU</span><h2>Available vehicles <span>{vehicles.length.toString().padStart(2,'0')}</span></h2></div><span className="sort-label">LATEST ADDED <span>↓</span></span></section>
        {vehicles.length === 0 ? <div className="empty-state"><CarFront size={35}/><h3>No vehicles found</h3><p>Try changing your filters, or add a vehicle if you are an administrator.</p>{isAdmin && <button className="primary-btn" onClick={openCreate}><Plus size={16}/> Add first vehicle</button>}</div> :
          <section className="vehicle-grid">{vehicles.map((vehicle, index) => <article className="vehicle-card" key={vehicle.id}>
            <div className={`vehicle-image vehicle-tone-${index % 4}`}>
              {vehicle.image_url ? <img src={vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} onError={e => {e.currentTarget.style.display='none'}}/> : <CarFront size={86} strokeWidth={1.1}/>}
              <span className="category-pill">{vehicle.category}</span><span className={`stock-pill ${vehicle.quantity === 0 ? 'out' : ''}`}>{vehicle.quantity === 0 ? 'OUT OF STOCK' : `${vehicle.quantity} IN STOCK`}</span>
            </div>
            <div className="vehicle-content"><div className="vehicle-meta">{vehicle.year || '—'} <span>•</span> {vehicle.category.toUpperCase()}</div><h3>{vehicle.make} <em>{vehicle.model}</em></h3><p className="vehicle-desc">{vehicle.description || 'Thoughtfully selected for your next journey.'}</p><div className="vehicle-bottom"><div><small>STARTING AT</small><strong>{money(vehicle.price)}</strong></div><button className="purchase-btn" disabled={vehicle.quantity === 0} onClick={() => purchase(vehicle)}>{vehicle.quantity === 0 ? 'Unavailable' : 'Purchase'} <span>↗</span></button></div>
              {isAdmin && <div className="admin-actions"><button onClick={() => openEdit(vehicle)}>Edit</button><button onClick={() => restock(vehicle)}>Restock</button><button onClick={() => deleteVehicle(vehicle)}>Delete</button></div>}
            </div>
          </article>)}</section>}
        <footer className="dashboard-footer"><span>© 2026 DRIVELUX MOTOR COMPANY</span><span>MADE FOR THE LOVE OF DRIVING</span></footer>
      </main>
      {showForm && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowForm(false)}}><section className="vehicle-modal"><div className="modal-title"><div><span className="eyebrow muted">INVENTORY MANAGEMENT</span><h2>{editing ? 'Edit vehicle' : 'Add a vehicle'}</h2></div><button className="icon-btn" onClick={() => setShowForm(false)}><X size={20}/></button></div>
        <form onSubmit={saveVehicle} className="vehicle-form">
          <label>Make<input required value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm,make:e.target.value})}/></label>
          <label>Model<input required value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm,model:e.target.value})}/></label>
          <label>Category<select value={vehicleForm.category} onChange={e => setVehicleForm({...vehicleForm,category:e.target.value})}>{['SUV','Sedan','Hatchback','Coupe','Luxury','Electric','Pickup'].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Price (₹)<input type="number" min="1" required value={vehicleForm.price} onChange={e => setVehicleForm({...vehicleForm,price:e.target.value})}/></label>
          <label>Quantity<input type="number" min="0" step="1" required value={vehicleForm.quantity} onChange={e => setVehicleForm({...vehicleForm,quantity:e.target.value})}/></label>
          <label>Year<input type="number" min="1886" max="2100" value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm,year:e.target.value})}/></label>
          <label className="wide-field">Image URL<input type="url" value={vehicleForm.image_url} onChange={e => setVehicleForm({...vehicleForm,image_url:e.target.value})} placeholder="https://…"/></label>
          <label className="wide-field">Description<textarea rows="3" value={vehicleForm.description} onChange={e => setVehicleForm({...vehicleForm,description:e.target.value})}/></label>
          <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add vehicle'} <span>↗</span></button></div>
        </form>
      </section></div>}
      {notice && <Toast notice={notice}/>}
    </div>
  )
}

function Stat({icon,label,value,detail}) { return <article className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article> }
function Toast({notice}) { return <div className={`toast ${notice.kind}`}><span>{notice.kind==='error'?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}</span>{notice.message}</div> }
