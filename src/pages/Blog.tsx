import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, Clock, Eye, ArrowRight, 
  Sparkles, Tag, ChevronRight, Sun, Moon, 
  Share2, ShieldCheck, Zap, User, ThumbsUp, Check, ArrowLeft 
} from 'lucide-react';
import { getBlogPosts, BlogPost, INITIAL_BLOG_POSTS } from '../lib/blogService';
import { PWAInstallBanner } from '../components/pwa/PWAInstallBanner';

export const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Light / Dark Theme State synchronized with localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark' ? 'dark' : 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('mbi_landing_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const isDark = theme === 'dark';

  useEffect(() => {
    window.scrollTo(0, 0);
    // Fetch from backend API or fallback to blogService
    fetch('/api/blogs')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
        } else {
          setPosts(getBlogPosts());
        }
      })
      .catch(() => {
        setPosts(getBlogPosts());
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => [
    { id: 'All', label: 'All Guides', count: posts.length },
    { id: 'FEFO & Expiry', label: 'FEFO & Expiry Radar', count: posts.filter(p => p.category === 'FEFO & Expiry').length },
    { id: 'Inventory & Batch', label: 'Smart Inventory', count: posts.filter(p => p.category === 'Inventory & Batch' || p.category === 'Inventory').length },
    { id: 'Business Tips', label: 'Pharmacy Growth', count: posts.filter(p => p.category === 'Business Tips').length },
    { id: 'Sargodha Local', label: 'Local Case Studies', count: posts.filter(p => p.isSargodhaLocal).length },
  ], [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.targetKeywords && post.targetKeywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())));

      if (!matchesSearch) return false;
      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Sargodha Local') return post.isSargodhaLocal;
      if (selectedCategory === 'Inventory & Batch') return post.category === 'Inventory' || post.category === 'Inventory & Batch';
      return post.category === selectedCategory;
    });
  }, [posts, searchTerm, selectedCategory]);

  const featuredPost = useMemo(() => {
    return posts.find(p => p.featured) || posts[0];
  }, [posts]);

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <PWAInstallBanner />

      {/* Header Navigation */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#131d33]/90 border-slate-800/80 shadow-lg shadow-black/20' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-6 sm:gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md">
              M
            </div>
            <div>
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                MBI INVENTRA 
              </span>
              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                Knowledge & Guides Hub
              </span>
            </div>
          </Link>

          <nav className={`hidden md:flex items-center gap-6 text-xs font-bold ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/#features" className="hover:text-blue-600 transition-colors">Features</Link>
            <Link to="/#pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link to="/blog" className="text-blue-600 dark:text-blue-400 font-black">Blog & Guides</Link>
            <Link to="/#faq" className="hover:text-blue-600 transition-colors">FAQ</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            to="/register"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all"
          >
            10-Day Free Trial
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        
        {/* Hub Title Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 uppercase tracking-wide">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pharmacy Operations & Industry Insights</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
            MBI INVENTRA Guides & Knowledge Hub
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Practical strategies on eliminating expired medicine losses, master billing shortcuts, supplier khata accounting, and retail pharmacy growth in Pakistan.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search articles by title, keywords (e.g., FEFO, Expiry, POS, Augmentin, Ledgers)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : isDark 
                      ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Hero Article Card (if available and no search filter) */}
        {!searchTerm && selectedCategory === 'All' && featuredPost && (
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
            isDark 
              ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800' 
              : 'bg-gradient-to-r from-white via-blue-50/50 to-white border-slate-200'
          }`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Featured Masterclass
                  </span>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredPost.readTimeMinutes} min read
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                  <Link to={`/blog/${featuredPost.slug}`} className="hover:text-blue-600 transition-colors">
                    {featuredPost.title}
                  </Link>
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {featuredPost.summary}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {featuredPost.author.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{featuredPost.author}</div>
                      <div className="text-[10.5px] text-slate-400">{featuredPost.authorRole}</div>
                    </div>
                  </div>

                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all group"
                  >
                    <span>Read Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 h-56 sm:h-72 rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 relative">
                <img 
                  src={featuredPost.coverImage} 
                  alt={featuredPost.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Blog Posts Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{selectedCategory === 'All' ? 'Latest Published Articles' : `${selectedCategory} Articles`}</span>
              <span className="text-xs font-normal text-slate-400">({filteredPosts.length} guides found)</span>
            </h3>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No guides matching your search</h4>
              <p className="text-xs text-slate-500">Try searching with a broader keyword or select 'All Guides'.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className={`rounded-3xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:scale-[1.01] hover:shadow-xl group ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50' 
                      : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Cover Thumbnail */}
                    <div className="h-44 w-full rounded-2xl overflow-hidden relative border border-slate-100 dark:border-slate-800">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                        {post.category}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{post.publishDate}</span>
                        <span>•</span>
                        <span>{post.readTimeMinutes} min read</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {post.views || 120}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        <Link to={`/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {post.summary}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-[11px] font-bold text-slate-500 truncate max-w-[150px]">
                      By {post.author}
                    </div>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Read More</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Clean Footer */}
      <footer className="bg-slate-900 text-white py-8 border-t border-slate-800 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} MBI INVENTRA Knowledge Hub. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/register" className="hover:text-white">10-Day Free Trial</Link>
            <Link to="/login" className="hover:text-white">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const BlogListingPage = Blog;
export default Blog;
