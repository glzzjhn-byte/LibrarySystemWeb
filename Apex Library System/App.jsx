import { useState, useEffect, useMemo, useCallback } from 'react';
const API_URL = 'https://nexus-status.42web.io/Main.php';

const apiFetch = async (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
};


const Input = (props) => <input {...props} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />;
const Button = ({ children, ...props }) => <button {...props} className="w-full px-4 py-2 text-white font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50">{children}</button>;
const Card = ({ children, ...props }) => <div {...props} className="bg-white shadow-md rounded-xl p-6 transition hover:shadow-lg hover:-translate-y-1">{children}</div>;


function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = isRegister ? 'register' : 'login';
    try {
      const response = await apiFetch(`${API_URL}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'An error occurred.');

      if (isRegister) {
        setMessage({ text: 'Registration successful! Please log in.', isError: false });
        setIsRegister(false);
      } else {
        onLogin();
      }
    } catch (error) {
      setMessage({ text: error.message, isError: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="max-w-md w-full p-8 space-y-6 bg-white shadow-lg rounded-2xl">
        <h2 className="text-3xl font-bold text-center text-slate-800">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
        {message.text && <p className={`text-center ${message.isError ? 'text-red-500' : 'text-green-500'}`}>{message.text}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit">{isRegister ? 'Register' : 'Login'}</Button>
        </form>
        <p className="text-center text-sm text-slate-600">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => setIsRegister(!isRegister)} className="font-semibold text-indigo-600 hover:underline ml-1">
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

//  Book Card Component 

function BookCard({ book, onAction, actionType }) {
  const handleAction = () => {
    if (actionType === 'delete') {
      onAction(book.id);
    } else if (actionType === 'add') {
      onAction(book);
    }
  };

  const statusPill = (text, color) => <div className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${color}`}>{text}</div>;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-slate-800">{book.title}</h3>
          {book.status === 'local' && statusPill('In Library', 'bg-blue-100 text-blue-800')}
          {book.status === 'available' && statusPill('In System', 'bg-green-100 text-green-800')}
          {book.status === 'online' && statusPill('Online', 'bg-purple-100 text-purple-800')}
        </div>
        <p className="text-slate-600 italic mb-1">by {book.author}</p>
        <p className="text-sm text-slate-400">ISBN: {book.isbn}</p>
      </div>
      <div className="mt-4">
        {actionType === 'delete' && <button onClick={handleAction} className="w-full text-sm font-semibold text-red-600 hover:text-red-800 transition">Delete</button>}
        {actionType === 'add' && <button onClick={handleAction} className="w-full text-sm font-semibold text-green-600 hover:text-green-800 transition">Add to Library</button>}
      </div>
    </Card>
  );
}

// Main Application

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localBooks, setLocalBooks] = useState([]);
  const [onlineResults, setOnlineResults] = useState([]);
  const [query, setQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Check session 
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiFetch(`${API_URL}?action=check_auth`);
        if (res.ok) setIsAuthenticated(true);
      } catch (e) {
        console.error("No active session");
      } finally {
        setIsLoadingSession(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBooks();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!query) {
      setOnlineResults([]);
      setSearchStatus('');
      return;
    }

    setSearchStatus('Searching online...');
    const timeoutId = setTimeout(() => {
      searchOnline(query);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const fetchBooks = async () => {
    try {
      const response = await apiFetch(`${API_URL}?action=books`);
      const data = await response.json();
      setLocalBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const addBook = async (book) => {
    try {
      await apiFetch(`${API_URL}?action=books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      fetchBooks(); // Refresh local library
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const deleteBook = async (id) => {
    try {
      await apiFetch(`${API_URL}?action=books&id=${id}`, { method: 'DELETE' });
      fetchBooks(); // Refresh local library
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const searchOnline = async (q) => {
    try {
      const response = await apiFetch(`${API_URL}?action=search_online&q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setOnlineResults(data);
      setSearchStatus(data.length > 0 ? 'Search complete.' : 'No online results found.');
    } catch (error) {
      console.error('Error searching online:', error);
      setSearchStatus('Error during search.');
    }
  };

  const handleLogout = async () => {
    await apiFetch(`${API_URL}?action=logout`, { method: 'POST' });
    setIsAuthenticated(false);
    setLocalBooks([]);
    setQuery('');
  };

  const handleAddToLibrary = (book) => {
    addBook(book);
  };

  // Memoized and combined search results
  const displayedBooks = useMemo(() => {
    const lowerQuery = query.toLowerCase();

    // 1. Filter local books
    const filteredLocal = query ? localBooks.filter(b =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.author.toLowerCase().includes(lowerQuery)
    ) : localBooks;

    return filteredLocal.map(b => ({ ...b, status: 'local' }));
  }, [query, localBooks, onlineResults]);

  // --- Render logic ---

  if (isLoadingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Verifying Session...</div>;
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Apex Library</h1>
          <Button onClick={handleLogout} className="w-auto !bg-slate-200 !text-slate-700 hover:!bg-slate-300">Logout</Button>
        </nav>
      </header>

      <main className="container mx-auto p-6">
        <div className="bg-white p-4 rounded-xl shadow-md mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center relative">
            <div className="relative flex-grow w-full">
              <Input
                type="text"
                placeholder="Search your library or find new books online..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
              
              {query.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-[100] max-h-80 overflow-y-auto border border-slate-200">
                  {searchStatus === 'Searching online...' ? (
                    <div className="p-4 text-center text-sm text-slate-500">Searching online...</div>
                  ) : onlineResults.length > 0 ? (
                    onlineResults.map((book, idx) => {
                      const isAvailable = localBooks.some(lb => (lb.isbn && lb.isbn === book.isbn) || lb.title.toLowerCase() === book.title.toLowerCase());
                      return (
                        <div key={idx} className="flex items-center p-3 border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
                          {book.isbn !== 'N/A' ? (
                            <img src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-S.jpg`} alt={book.title} className="w-10 h-14 object-cover rounded mr-4 bg-slate-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-14 rounded mr-4 bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] text-slate-400 text-center leading-tight">No Cover</div>
                          )}
                          <div className="flex-grow text-left min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 truncate" title={book.title}>{book.title}</h4>
                            <p className="text-xs text-slate-500 truncate" title={book.author}>{book.author}</p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            {isAvailable ? (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Available</span>
                            ) : (
                              <Button className="!py-1 !px-3 !text-xs !w-auto whitespace-nowrap" onClick={() => handleAddToLibrary(book)}>Add</Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">No online results found.</div>
                  )}
                </div>
              )}
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="w-full md:w-auto">
              {showAddForm ? 'Cancel' : 'Add New Book'}
            </Button>
          </div>
        </div>

        {showAddForm && (
          <AddBookForm
            onAddBook={addBook}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {displayedBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedBooks.map((book, index) => (
              <BookCard
                key={book.id || book.isbn || index}
                book={book}
                actionType={book.status === 'local' ? 'delete' : (book.status === 'online' ? 'add' : null)}
                onAction={book.status === 'local' ? deleteBook : handleAddToLibrary}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-slate-700">No books found.</h3>
            <p className="text-slate-500">Try a different search or add a new book to your library.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function AddBookForm({ onAddBook, onCancel }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddBook({ title, author, isbn });
    setTitle('');
    setAuthor('');
    setIsbn('');
  };

  return (
    <Card className="mb-8 max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold text-center text-slate-800">Add a New Book Manually</h2>
        <Input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <Input type="text" placeholder="Author" value={author} onChange={e => setAuthor(e.target.value)} required />
        <Input type="text" placeholder="ISBN" value={isbn} onChange={e => setIsbn(e.target.value)} required />
        <div className="flex gap-4">
          <Button type="button" onClick={onCancel} className="!bg-slate-300 !text-slate-800 hover:!bg-slate-400">Cancel</Button>
          <Button type="submit">Add Book</Button>
        </div>
      </form>
    </Card>
  );
}

export default App;