import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Calendar, Eye, ThumbsUp, 
  Share2, BookOpen, ChevronRight, Sparkles, Tag, 
  Check, Sun, Moon, MessageSquare, ShieldCheck 
} from 'lucide-react';
import { getBlogPostBySlug, getRelatedBlogPosts, incrementBlogViews, likeBlogPost, BlogPost } from '../lib/blogService';
import { PWAInstallBanner } from '../components/pwa/PWAInstallBanner';

export const BlogPostDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Theme State
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
    if (!slug) return;

    // Try backend fetch first, fallback to local
    fetch(`/api/blogs/${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.post) {
          setPost(data.post);
          setLikesCount(data.post.likes || 0);
          setRelatedPosts(getRelatedBlogPosts(data.post.id, 3));
        } else {
          fallbackLocal();
        }
      })
      .catch(() => {
        fallbackLocal();
      })
      .finally(() => {
        setLoading(false);
      });

    function fallbackLocal() {
      const article = getBlogPostBySlug(slug!);
      if (article) {
        setPost(article);
        setLikesCount(article.likes || 0);
        incrementBlogViews(article.id);
        setRelatedPosts(getRelatedBlogPosts(article.id, 3));
      } else {
        setPost(null);
      }
    }
  }, [slug]);

  const handleLike = () => {
    if (!post || hasLiked) return;
    const newLikes = likeBlogPost(post.id);
    setLikesCount(newLikes);
    setHasLiked(true);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!post && !loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 space-y-4 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <BookOpen className="w-12 h-12 text-blue-500 animate-bounce" />
        <h2 className="text-xl font-bold">Article Not Found</h2>
        <p className="text-xs text-slate-400">The requested guide could not be found or may have been updated.</p>
        <button 
          onClick={() => navigate('/blog')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all cursor-pointer"
        >
          Return to Blog Hub
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <PWAInstallBanner />

      {/* Header Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#131d33]/90 border-slate-800/80 shadow-lg shadow-black/20' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/blog" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Guides</span>
          </Link>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
          <Link to="/" className="font-black text-sm text-slate-900 dark:text-white">
            MBI INVENTRA 
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      {/* Main Article Container */}
      {post && (
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          
          {/* Article Header Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                {post.category}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {post.readTimeMinutes} min read
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {post.publishDate}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white leading-tight">
              {post.title}
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {post.summary}
            </p>

            {/* Author & Share Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{post.author}</div>
                  <div className="text-[11px] text-slate-400">{post.authorRole}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    hasLiked 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                  <span>{likesCount} Helpful</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cover Hero Banner */}
          <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <img 
              src={post.coverImage} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Markdown Body */}
          <div className={`prose prose-sm sm:prose-base max-w-none p-6 sm:p-10 rounded-3xl border ${
            isDark 
              ? 'bg-slate-900/90 border-slate-800 text-slate-200 prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white' 
              : 'bg-white border-slate-200 text-slate-800 prose-headings:text-slate-950 prose-a:text-blue-600'
          }`}>
            <div className="whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>
          </div>

          {/* Callout Card: Try MBI Inventra Free */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl space-y-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <h3 className="text-xl font-black">Ready to eliminate pharmacy losses?</h3>
              <p className="text-xs text-blue-100">
                Activate your 10-day free trial now. Full POS billing, FEFO alerts, and thermal printing included.
              </p>
            </div>
            <Link
              to="/register"
              className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl text-xs font-black shadow-lg transition-all shrink-0 inline-block"
            >
              Start 10-Day Free Trial
            </Link>
          </div>

          {/* Related Articles Section */}
          {relatedPosts.length > 0 && (
            <div className="pt-6 space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Related Pharmacy Guides</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/blog/${rel.slug}`}
                    className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] space-y-2 block ${
                      isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
                    }`}
                  >
                    <div className="h-28 w-full rounded-xl overflow-hidden mb-2">
                      <img src={rel.coverImage} alt={rel.title} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">{rel.category}</span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">{rel.title}</h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </main>
      )}

      {/* Clean Footer */}
      <footer className="bg-slate-900 text-white py-8 border-t border-slate-800 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} MBI INVENTRA. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="hover:text-white">All Guides</Link>
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/register" className="hover:text-white">Free Trial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const BlogDetailPage = BlogPostDetail;
export default BlogPostDetail;
