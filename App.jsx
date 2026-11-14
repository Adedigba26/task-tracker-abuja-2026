import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message); else setTasks(data)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      if (data.session) fetchTasks(); else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (session) fetchTasks()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault(); setError('')
    if (!email || !password) return setError('Email and password required')
    if (authMode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message); else setError('Account created! Now login.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
  }

  const addTask = async (e) => {
    e.preventDefault(); setError('')
    if (!title.trim()) return setError('Title is required')
    setSaving(true)
    const { error } = await supabase.from('tasks').insert([{ title: title.trim(), description: description.trim(), status: 'pending', user_id: user.id }])
    if (error) setError(error.message); else { setTitle(''); setDescription(''); fetchTasks() }
    setSaving(false)
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (error) setError(error.message); else fetchTasks()
  }

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) setError(error.message); else fetchTasks()
  }

  if (!user) return (
    <div className="container"><h1>Task Tracker</h1><p>Register, sign in and manage your own tasks.</p>
      <form onSubmit={handleAuth} className="card">
        <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} />
        <button>{authMode === 'login' ? 'Login' : 'Create Account'}</button>
        <p onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{cursor:'pointer', color:'blue'}}>{authMode === 'login' ? 'No account? Register' : 'Have account? Login'}</p>
        {error && <p className="error">{error}</p>}
      </form></div>
  )

  return (
    <div className="container">
      <div className="header"><h1>My Tasks</h1><button onClick={() => supabase.auth.signOut()}>Logout ({user.email})</button></div>
      {error && <p className="error">{error}</p>}
      <form onSubmit={addTask} className="card">
        <input placeholder="Title * e.g Buy bread" value={title} onChange={e => setTitle(e.target.value)} />
        <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        <button disabled={saving}>{saving ? 'Adding...' : 'Add Task'}</button>
      </form>
      {loading ? <p>Loading tasks...</p> : tasks.length === 0 ? <div className="empty"><h3>No tasks yet</h3><p>Add your first task above.</p></div> :
      tasks.map(t => (
        <div key={t.id} className="task-card">
          <div><strong>{t.title}</strong><p>{t.description || 'No description'}</p><small>{new Date(t.created_at).toLocaleString()} • {t.status}</small></div>
          <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>
            <option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
          </select>
          <button className="danger" onClick={() => deleteTask(t.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}



