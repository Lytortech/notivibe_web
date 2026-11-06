import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signInWithPopup, signOut
} from 'firebase/auth';
import {
  QrCode, ShieldCheck, Smartphone, Copy, LogOut, RefreshCw, Link2,
  CheckCircle2, Mail, LockKeyhole, Eye, EyeOff, ArrowRight, ArrowLeft,
  Bell, Clock3, MapPin, MessageCircle, Instagram, Send, Ghost, Check,
  Sparkles, Phone, CreditCard, CircleHelp, Home, BarChart3, Lock,
  ChevronRight, Battery, UserRound, Wifi
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { FaWhatsapp, FaInstagram, FaTelegramPlane, FaSnapchatGhost } from "react-icons/fa";
import { checkSubscription, createPairing, getPairingStatus, createPurchaseOrder, confirmPurchase } from './api';
import './style.css';

const INTRO_SLIDES = [
  {
    eyebrow: 'STAY CONNECTED',
    title: 'See what your child sees',
    description: 'Every notification, on your phone the moment it arrives.',
    icon: Bell,
    visual: <div className="intro-notification"><span className="app-dot whatsapp">W</span><div><b>New notification</b><small>Message received · Just now</small></div><span className="live-dot"/></div>
  },
  {
    eyebrow: 'HEALTHIER HABITS',
    title: 'Screen time that teaches',
    description: "Blocked apps unlock with a quick question — adapts to your child's age.",
    icon: Clock3,
    visual: <div className="intro-usage"><div className="usage-head"><span>Today's screen time</span><b>2h 18m</b></div><div className="usage-bar"><i/><i/><i/></div><div className="usage-legend"><span>Social</span><span>Learning</span><span>Other</span></div></div>
  },
  {
    eyebrow: 'ONE CALM VIEW',
    title: 'Everything in one calm view',
    description: "Location, screen time and alerts — know they're okay at a glance.",
    icon: MapPin,
    visual: <div className="intro-location"><div className="map-grid"><span className="map-road road-a"/><span className="map-road road-b"/><span className="map-road road-c"/><span className="map-pin"><MapPin size={20}/></span></div><div className="location-caption"><span className="location-check"><Check size={13}/></span><div><b>Location updated</b><small>Child's device · Just now</small></div></div></div>
  }
];

function subscriptionIsActive(data) {
  const status = String(data?.status ?? data?.subscriptionStatus ?? data?.subscription_status ?? '').toUpperCase();
  return data?.hasActiveSubscription === true || data?.active === true || data?.isActive === true || data?.isSubscribed === true ||
    ['ACTIVE', 'GRACE_PERIOD'].includes(status);
}

function ParentDashboard({ user, pairing, subscription, onSignOut }) {
  const [tab, setTab] = useState('home');
  const [child, setChild] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [range, setRange] = useState('today');
  const [appFilter, setAppFilter] = useState('All');
  const childUid = pairing?.childUid || pairing?.child_uid || '';
  const premium = subscriptionIsActive(subscription);

  useEffect(() => {
    if (!childUid) return;
    setLoading(true); setLoadError('');
    const unsub = onSnapshot(doc(db, 'ShareCodes', childUid), snap => {
      setChild(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, err => { setLoadError(`Could not read child data: ${err.message}`); setLoading(false); });
    return unsub;
  }, [childUid]);

  useEffect(() => {
    if (!childUid) return;
    getDocs(query(collection(db, 'ChildProfiles'), where('__name__', '==', childUid)))
      .then(s => setProfile(s.empty ? null : s.docs[0].data())).catch(() => {});
  }, [childUid]);

  useEffect(() => {
    if (!childUid) return;
    getDocs(query(collection(db, 'Notifications'), where('uid', '==', childUid)))
      .then(s => {
        const rows = s.docs.map(d => ({ id:d.id, ...d.data() }));
        const visible = premium ? rows : rows.filter(n => n.f1Free === true);
        visible.sort((a,b) => Number(b.timestamp || b.timeStamp || b.createdAt || 0) - Number(a.timestamp || a.timeStamp || a.createdAt || 0));
        setNotifications(visible);
      }).catch(err => setLoadError(`Could not load notifications: ${err.message}`));
  }, [childUid, premium]);

  const tracking = child?.apptrackingdata || {};
  const locks = child?.applocks || {};
  const lockedApps = Object.entries(locks).filter(([k,v]) => !['schedule','lastupdated'].includes(k) && v === true);
  const totalMs = Number(tracking.totalscreentime || 0);
  const formatDuration = ms => { const m=Math.floor(ms/60000); return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`; };
  const last = Number(child?.lastupdated || 0);
  const online = last > 0 && (Date.now()-last) < 2*60*1000;
  const appRows = Array.isArray(tracking.apps) ? tracking.apps : Object.entries(tracking.apps || {}).map(([name,v]) => typeof v === 'object' ? {appName:name,...v} : {appName:name,usage:v});
  const appName = n => n.appName || n.name || n.app_name || n.packageName || 'App';
  const appTime = n => Number(n.usage || n.time || n.totalTime || n.usageTime || n.foregroundTime || 0);
  const filtered = notifications.filter(n => appFilter==='All' || String(n.packageName || n.package_name || n.app || n.appName || '').toLowerCase().includes(appFilter.toLowerCase()));
  const timeOf = n => { const v=n.timestamp || n.timeStamp || n.createdAt || 0; const d=new Date(typeof v==='object'&&v.toDate?v.toDate():Number(v)<1e12?Number(v)*1000:v); return Number.isNaN(d.getTime())?'':d.toLocaleString(); };
  const titleOf = n => n.sender_name || n.senderName || n.title || n.appName || 'Notification';
  const textOf = n => n.message || n.text || n.content || n.notificationText || '';
  const go = key => setTab(key);

  return <main className="parent-dashboard">
    <aside className="dash-sidebar"><div className="dash-side-brand"><span className="brand-mark">n</span> notivibe</div><div className="dash-child-chip"><div className="dash-child-avatar">{(child?.sender_name || 'C').charAt(0).toUpperCase()}</div><div><b>{child?.sender_name || 'Child device'}</b><small>{online?'Online':'Last seen / offline'}</small></div><i className={online?'online-dot':''}/></div><nav>{[['home','Home',Home],['alerts','Alerts',Bell],['usage','Usage',BarChart3],['lock','Lock',Lock]].map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><Icon size={18}/>{label}{id==='alerts'&&notifications.length>0&&<span className="nav-count">{notifications.length>99?'99+':notifications.length}</span>}</button>)}</nav><button className="dash-signout" onClick={onSignOut}><LogOut size={17}/> Sign out</button></aside>
    <section className="dash-main"><header className="dash-top"><div><span className="dash-eyebrow">PARENT CONTROL CENTER</span><h1>{tab==='home'?'Family overview':tab==='alerts'?'Notifications':tab==='usage'?'Screen time & usage':'App lock'}</h1></div><div className="dash-top-right"><span className="plan-chip">{premium?'Premium plan':'Free access'}</span><span className="dash-user">{user.email}</span></div></header>
      {loadError&&<div className="alert error">{loadError}</div>}
      {loading?<div className="dash-loading"><div className="spinner"/><b>Loading your child's actual data…</b><span>Connecting to the existing Notivibe data</span></div>:!child?<div className="dash-empty"><Smartphone size={30}/><h2>Child data is not available yet</h2><p>The pairing API reports a connection, but <code>ShareCodes/{childUid}</code> was not found or cannot be read. Check that the child app writes this document and Firebase rules allow the parent to read it.</p></div>:<>
      {tab==='home'&&<><div className="dash-welcome"><div><h2>{child.sender_name || 'Your child'}'s device</h2><p>Connected Notivibe device overview</p></div><span className={`device-status ${online?'is-online':''}`}><i/>{online?'Online':'Offline'}</span></div><div className="metric-grid"><article className="metric-card"><span><Bell size={17}/> Notifications</span><strong>{notifications.length}</strong><small>{premium?'Available notifications':'Free notifications visible'}</small><button onClick={()=>go('alerts')}>View alerts <ChevronRight size={14}/></button></article><article className="metric-card"><span><Clock3 size={17}/> Screen time</span><strong>{totalMs?formatDuration(totalMs):'--'}</strong><small>From apptrackingdata.totalscreentime</small><button onClick={()=>go('usage')}>View usage <ChevronRight size={14}/></button></article><article className="metric-card"><span><Lock size={17}/> Locked apps</span><strong>{lockedApps.length}</strong><small>Current applocks settings</small><button onClick={()=>go('lock')}>Manage locks <ChevronRight size={14}/></button></article><article className="metric-card"><span><Battery size={17}/> Battery</span><strong>{child.battery_pct!=null?`${child.battery_pct}%`:'--'}</strong><small>{last?`Last update ${new Date(last).toLocaleString()}`:'No device timestamp'}</small></article></div><div className="dash-two-col"><article className="dash-panel"><h3>Child profile</h3><div className="profile-line"><UserRound size={19}/><div><b>{child.sender_name || 'Child device'}</b><small>{profile?.gradeLevelLabel || 'Grade not provided'}</small></div></div><div className="profile-line"><Wifi size={19}/><div><b>{online?'Device online':'Device offline'}</b><small>{last?`Last updated ${new Date(last).toLocaleString()}`:'Last update unavailable'}</small></div></div></article><article className="dash-panel"><h3>Latest notifications</h3>{notifications.slice(0,4).map(n=><div className="mini-alert" key={n.id}><b>{titleOf(n)}</b><small>{timeOf(n)}</small><p>{textOf(n)||'Notification content unavailable'}</p></div>)}{!notifications.length&&<p className="empty-copy">No accessible notifications found.</p>}<button className="link-btn" onClick={()=>go('alerts')}>Open alerts <ChevronRight size={14}/></button></article></div></>}
      {tab==='alerts'&&<div className="dash-panel"><div className="panel-heading"><div><h3>Notifications</h3><p>{premium?'Showing notifications for this child':'Showing only notifications marked f1Free by your Android app'}</p></div><select value={appFilter} onChange={e=>setAppFilter(e.target.value)}><option>All</option><option>WhatsApp</option><option>Instagram</option><option>Telegram</option><option>Snapchat</option></select></div>{filtered.map(n=><div className="alert-row" key={n.id}><div className="alert-app-icon"><Bell size={17}/></div><div className="alert-row-copy"><b>{titleOf(n)}</b><small>{n.packageName||n.package_name||n.appName||'App'} · {timeOf(n)}</small><p className={!premium?'premium-blur':''}>{premium||n.f1Free?textOf(n):'Subscribe to view this notification'}</p></div>{!premium&&!n.f1Free&&<Lock size={16}/>}</div>)}{!filtered.length&&<div className="empty-copy">No notifications available for this filter.</div>}{!premium&&<div className="locked-note"><Lock size={16}/> Premium notifications remain hidden. Upgrade through your existing Notivibe subscription flow.</div>}</div>}
      {tab==='usage'&&<><div className="usage-summary"><span>Total screen time</span><strong>{totalMs?formatDuration(totalMs):'--'}</strong><small>Actual value from ShareCodes/{childUid}.apptrackingdata</small></div><div className="dash-panel"><h3>App usage</h3>{appRows.map((a,i)=><div className="usage-row" key={appName(a)+i}><div><b>{appName(a)}</b><small>{a.packageName||a.package_name||''}</small></div><div className="usage-row-time">{formatDuration(appTime(a))}</div></div>)}{!appRows.length&&<p className="empty-copy">No per-app usage records found in apptrackingdata.apps.</p>}</div></>}
      {tab==='lock'&&<div className="dash-panel"><div className="panel-heading"><div><h3>App lock settings</h3><p>Current lock configuration from ShareCodes/{childUid}.applocks</p></div><span className="plan-chip">{lockedApps.length} locked</span></div>{Object.entries(locks).filter(([k])=>!['schedule','lastupdated'].includes(k)).map(([key,value])=><div className="usage-row" key={key}><div><b>{key.replaceAll('_','.')}</b><small>Package lock setting</small></div><span className={`lock-state ${value===true?'locked':'unlocked'}`}>{value===true?'Locked':'Unlocked'}</span></div>)}{!Object.keys(locks).length&&<p className="empty-copy">No app lock settings found.</p>}<p className="locked-note">This web version currently displays the Android app's saved lock settings. Control changes are not enabled until the existing child-device update flow is confirmed.</p></div>}
      </>}
      <footer className="dash-foot">Notivibe · Data shown from your connected child's existing app records</footer>
    </section>
  </main>;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState(() => localStorage.getItem('notivibe_web_intro_seen') === '1' ? 'auth' : 'intro');
  const [dashboardOpened, setDashboardOpened] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [invite, setInvite] = useState(null);
  const [pairing, setPairing] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('six');
  const [paymentBusy, setPaymentBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setAuthLoading(false);
    if (current) verifyParentSubscription(current);
    else {
      setSubscription(null); setPairing(null); setInvite(null);
      setStep(localStorage.getItem('notivibe_web_intro_seen') === '1' ? 'auth' : 'intro');
    }
  }), []);

  const inviteUrl = useMemo(() => invite?.joinUrl || '', [invite]);
  const connected = String(pairing?.status || '').toUpperCase() === 'CONNECTED' || Boolean(pairing?.childUid);
  const active = subscriptionIsActive(subscription);

  async function verifyParentSubscription(currentUser = user, keepSubscriptionScreen = false) {
    if (!currentUser) return;
    setStep('checking'); setSubscriptionLoading(true); setError('');
    try {
      const token = await currentUser.getIdToken();
      const result = await checkSubscription(currentUser.uid, token);
      setSubscription(result);
      if (subscriptionIsActive(result)) {
        setStep('connect');
        await loadPairingStatus(currentUser, token);
      } else {
        setStep(keepSubscriptionScreen ? 'subscription' : 'phone');
      }
    } catch (e) {
      setError(`Could not verify your subscription: ${e.message}`);
      setStep('verify-error');
    } finally { setSubscriptionLoading(false); }
  }

  async function loadPairingStatus(currentUser = user, existingToken) {
    if (!currentUser) return;
    try {
      const token = existingToken || await currentUser.getIdToken();
      const result = await getPairingStatus(token);
      setPairing(result);
    } catch (e) { setError(`Could not load connection status: ${e.message}`); }
  }

  useEffect(() => {
    if (!user || step !== 'connect' || connected) return;
    const timer = setInterval(() => loadPairingStatus(user), 5000);
    return () => clearInterval(timer);
  }, [user, step, connected]);

  useEffect(() => {
    if (step !== 'preparing') return;
    setPreparationProgress(0);
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(100, Math.round(((Date.now() - started) / 4200) * 100));
      setPreparationProgress(next);
      if (next >= 100) {
        clearInterval(timer);
        setTimeout(() => setStep('preview'), 450);
      }
    }, 70);
    return () => clearInterval(timer);
  }, [step]);

  function finishIntro() {
    localStorage.setItem('notivibe_web_intro_seen', '1');
    setStep('auth');
  }

  async function handleAuth(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) { setError(authMessage(e.code, e.message)); }
    finally { setBusy(false); }
  }

  async function googleLogin() {
    setBusy(true); setError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(authMessage(e.code, e.message)); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setNotice('Password reset email sent. Check your inbox.'); setError(''); }
    catch (e) { setError(authMessage(e.code, e.message)); }
  }

  function continueFromPhone(event) {
    event.preventDefault(); setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 14) { setError('Enter a valid phone number.'); return; }
    setPhone(`${countryCode}${digits}`);
    localStorage.setItem('notivibe_parent_contact_phone', `${countryCode}${digits}`);
    setStep('preparing');
  }

  async function generateInvite() {
    setPairingLoading(true); setError('');
    try {
      const token = await user.getIdToken();
      const result = await createPairing(token);
      if (!result?.joinUrl || !result?.pairingToken) throw new Error('The API response did not include joinUrl and pairingToken.');
      setInvite(result); setPairing({ status: 'WAITING' });
    } catch (e) { setError(`Could not generate invite: ${e.message}`); }
    finally { setPairingLoading(false); }
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); setNotice('Invite link copied. Share it with your child.'); }
    catch { setError('Could not copy automatically. Select and copy the invite link.'); }
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function startWebPayment() {
    if (!user || paymentBusy) return;
    setPaymentBusy(true); setError(''); setNotice('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Unable to load secure payment checkout. Please try again.');
      const token = await user.getIdToken();
      const planKey = selectedPlan === 'three' ? 'quarterly' : selectedPlan === 'six' ? 'biannual' : 'annual';
      const idempotencyKey = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const order = await createPurchaseOrder({
        userId: user.uid, planKey, userEmail: user.email || '',
        userName: user.displayName || 'Notivibe User', paymentMethod: 'razorpay', idempotencyKey
      }, token);
      if (!order?.success || !order?.orderId || !order?.keyId || !order?.amount) {
        throw new Error(order?.message || 'The payment order could not be created.');
      }
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency || 'INR',
        name: 'Notivibe', description: `${order.planName || 'Notivibe'} Premium`, order_id: order.orderId,
        prefill: { name: user.displayName || '', email: user.email || '' },
        theme: { color: '#6754e8' },
        handler: async (response) => {
          setPaymentBusy(true); setNotice('Payment received. Verifying your subscription…');
          try {
            const freshToken = await user.getIdToken(true);
            const confirmation = await confirmPurchase({
              userId: user.uid, razorpayOrderId: response.razorpay_order_id || order.orderId,
              razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature
            }, freshToken);
            if (!confirmation?.success) throw new Error(confirmation?.message || 'Payment confirmation failed.');
            setNotice('Payment confirmed. Checking your Notivibe access…');
            await verifyParentSubscription(user, true);
          } catch (confirmError) {
            setError(`Payment was received, but verification needs attention: ${confirmError.message}`);
            setStep('subscription');
          } finally { setPaymentBusy(false); }
        },
        modal: { ondismiss: () => setPaymentBusy(false) }
      });
      checkout.on('payment.failed', (event) => {
        setError(event?.error?.description || 'Payment was not completed. You can try again.');
        setPaymentBusy(false);
      });
      checkout.open();
    } catch (e) { setError(e.message || 'Could not start payment.'); setPaymentBusy(false); }
  }

  async function logout() {
    await signOut(auth); setEmail(''); setPassword(''); setStep('auth');
  }

  if (authLoading) return <div className="screen-center"><div className="spinner"/></div>;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>e.preventDefault()}><span className="brand-mark">n</span><span>notivibe</span></a>
      <div className="topbar-right">{user && <span className="signed-in-label">{user.email}</span>}{user && <button className="logout" onClick={logout}><LogOut size={16}/> Sign out</button>}</div>
    </header>

    {step === 'intro' && <main className="intro-page">
      <div className="intro-progress">{INTRO_SLIDES.map((_,i)=><span key={i} className={i<=introIndex?'done':''}/>)}</div>
      <div className="intro-content">
        <div className="intro-art-wrap"><div className="intro-art-glow"/><div className="intro-art-card"><div className="intro-art-top"><span className="mini-brand"><span>n</span> notivibe</span><span className="secure-tag"><ShieldCheck size={12}/> SAFE & SECURE</span></div><div className="intro-art-visual">{INTRO_SLIDES[introIndex].visual}</div><div className="intro-art-footer"><span className="art-status-dot"/> Family protection is ready</div></div><div className="intro-floating-badge"><ShieldCheck size={16}/> Parent peace of mind</div></div>
        <div className="intro-copy"><div className="intro-eyebrow"><Sparkles size={14}/> {INTRO_SLIDES[introIndex].eyebrow}</div><h1>{INTRO_SLIDES[introIndex].title}</h1><p>{INTRO_SLIDES[introIndex].description}</p><div className="intro-actions"><button className="primary-btn" onClick={()=>introIndex===INTRO_SLIDES.length-1?finishIntro():setIntroIndex(v=>v+1)}>{introIndex===INTRO_SLIDES.length-1?'Get started':'Continue'} <ArrowRight size={17}/></button>{introIndex>0 && <button className="text-btn" onClick={()=>setIntroIndex(v=>v-1)}><ArrowLeft size={15}/> Back</button>}<button className="skip-btn" onClick={finishIntro}>Skip intro</button></div></div>
      </div>
    </main>}

    {step === 'auth' && !user && <main className="auth-layout">
      <section className="hero-panel"><div className="hero-badge"><ShieldCheck size={15}/> Family digital wellbeing</div><h1>A safer digital world starts with <span>connection.</span></h1><p>Connect your child's phone and manage your family's digital wellbeing from one calm place.</p><div className="hero-visual"><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="phone-card"><div className="phone-notch"/><div className="phone-logo">n</div><div className="phone-line wide"/><div className="phone-line"/><div className="phone-alert"><ShieldCheck size={17}/><span>Family connected</span><CheckCircle2 size={17}/></div><div className="phone-line wide"/><div className="phone-line short"/></div><div className="floating-chip"><CheckCircle2 size={17}/> Peace of mind, together</div></div></section>
      <section className="auth-card"><div className="auth-icon"><LockKeyhole size={22}/></div><h2>{mode==='signup'?'Create your account':'Welcome back'}</h2><p className="muted">{mode==='signup'?'Create an account to get started with Notivibe.':"Sign in to manage your child's device."}</p>
        <form onSubmit={handleAuth}><label>Email address</label><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div><label>Password</label><div className="input-wrap"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={6} required/><button type="button" className="show-password" onClick={()=>setShowPassword(v=>!v)} aria-label="Toggle password">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          {mode==='login' && <button type="button" className="forgot" onClick={resetPassword}>Forgot password?</button>}
          <button className="primary-btn" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'} <span>→</span></button></form>
        <div className="separator"><span/>or continue with<span/></div><button className="google-btn" onClick={googleLogin} disabled={busy}><GoogleIcon/> Continue with Google</button>
        <p className="switch-auth">{mode==='signup'?'Already have an account?':'New to Notivibe?'} <button onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('');setNotice('');}}>{mode==='signup'?'Sign in':'Create account'}</button></p>
        <p className="secure-note"><ShieldCheck size={14}/> Your account is protected by Firebase Authentication.</p>
        {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
      </section>
    </main>}

    {step === 'checking' && <main className="flow-center"><div className="flow-card compact"><div className="flow-icon"><ShieldCheck size={27}/></div><h1>Verifying your subscription</h1><p>We're securely checking your Notivibe account before continuing.</p><div className="loading-row centered"><div className="spinner small"/> Checking account…</div></div></main>}

    {step === 'verify-error' && <main className="flow-center"><div className="flow-card compact"><div className="flow-icon warning"><CircleHelp size={27}/></div><h1>Couldn't verify right now</h1><p>We couldn't reach the subscription service. Your access hasn't been changed.</p>{error && <div className="alert error">{error}</div>}<button className="primary-btn" onClick={()=>verifyParentSubscription(user)}>Try again <RefreshCw size={16}/></button></div></main>}

    {step === 'phone' && user && <main className="flow-center"><div className="flow-card phone-flow"><div className="flow-step">ACCOUNT SETUP <span>01 / 03</span></div><div className="flow-icon"><Phone size={26}/></div><h1>Enter your phone number</h1><p>We'll use this number for your Notivibe setup and important account communication.</p><form onSubmit={continueFromPhone}><label>Mobile number</label><div className="phone-input-row"><select value={countryCode} onChange={e=>setCountryCode(e.target.value)} aria-label="Country calling code"><option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+971">🇦🇪 +971</option><option value="+61">🇦🇺 +61</option></select><input type="tel" value={phone.replace(/^\+\d+/, '')} onChange={e=>setPhone(e.target.value)} placeholder="Enter mobile number" required/></div><p className="privacy-hint"><ShieldCheck size={14}/> Your number is handled securely.</p>{error && <div className="alert error">{error}</div>}<button className="primary-btn">Continue <ArrowRight size={17}/></button></form><button className="back-link" onClick={()=>setStep('auth')}><ArrowLeft size={14}/> Back to account</button></div></main>}

    {step === 'preparing' && <main className="flow-center"><div className="flow-card preparation-card"><div className="secure-tag"><ShieldCheck size={13}/> SECURE PREVIEW</div><div className="prep-orbit"><div className="prep-logo">n</div><span className="prep-orbit-dot dot-one"/><span className="prep-orbit-dot dot-two"/><span className="prep-orbit-dot dot-three"/></div><h1>Preparing your preview</h1><p>Setting up a protected example with consent-based monitoring.</p><div className="prep-progress-head"><span>Preparing activity preview</span><b>{preparationProgress}%</b></div><div className="prep-progress"><span style={{width:`${preparationProgress}%`}}/></div><div className="prep-platforms">{[[<FaWhatsapp/>, 'WhatsApp'],[<FaInstagram/>, 'Instagram'],[<FaTelegramPlane/>, 'Telegram'],[<FaSnapchatGhost/>, 'Snapchat']].map(([icon,name])=><div className="prep-platform" key={name}><span className={`brand-icon ${name.toLowerCase()}`}>{icon}</span>{name}<CheckCircle2 size={14}/></div>)}</div><small className="prep-disclaimer">This is a sample preview. No child's messages or private activity are accessed here.</small></div></main>}

    {step === 'preview' && <main className="preview-page"><div className="preview-phone-shell"><div className="preview-header"><span className="preview-brand">notivibe</span><button className="preview-get-started" onClick={()=>setStep('subscription')}>Get Started</button></div><div className="preview-title"><h1>Activity Preview</h1><p>Here's an example of how activity can appear.</p></div><div className="preview-tabs">{[[<FaWhatsapp/>, 'WhatsApp'],[<FaInstagram/>, 'Instagram'],[<FaTelegramPlane/>, 'Telegram'],[<FaSnapchatGhost/>, 'Snapchat']].map(([icon,name],i)=><div className={`${i===0?'selected ':''}preview-tab-${name.toLowerCase()}`} key={name}><b className="preview-brand-icon">{icon}</b><span>{name}</span><small>{[12,7,4,2][i]}</small></div>)}</div><div className="preview-activity-title"><b>Recent activity</b><span><i className="preview-live-dot"/> SAMPLE PREVIEW</span></div><div className="preview-chat-list">{[['Aarav','Hey, are you free later?','10:42 AM',<FaWhatsapp/>,'whatsapp'],['Meera',"I'll call you tomorrow.",'10:18 AM',<FaWhatsapp/>,'whatsapp'],['Rohan','Did you get the notes?','09:56 AM',<FaInstagram/>,'instagram'],['Priya',"Let's talk after class.",'09:31 AM',<FaTelegramPlane/>,'telegram']].map(([name,msg,time,icon,brand],i)=><div className="preview-chat" style={{'--chat-index':i}} key={name}><span className="chat-avatar">{name[0]}</span><div className="chat-copy"><b>{name}</b><p>{msg}</p></div><small>{time}</small><span className={`chat-app ${brand}`}>{icon}</span></div>)}</div><div className="preview-locked"><LockKeyhole size={16}/><span>Full activity details are available after subscription and device connection.</span></div><button className="primary-btn preview-continue" onClick={()=>setStep('subscription')}>Continue <ArrowRight size={17}/></button></div><p className="preview-note">Illustrative sample data only — not real child activity.</p></main>}

    {step === 'subscription' && <main className="subscription-page"><div className="subscription-intro"><div className="flow-step">YOUR NOTIVIBE PLAN <span>02 / 03</span></div><div className="flow-icon"><ShieldCheck size={26}/></div><h1>Choose your protection plan</h1><p>Unlock the complete Notivibe family safety experience.</p></div><div className="plan-grid">{[
      {id:'three',name:'3 Months',price:'₹899',period:'for 3 months',detail:'A good place to start'},
      {id:'six',name:'6 Months',price:'₹1,499',period:'for 6 months',detail:'More value for your family',popular:true},
      {id:'year',name:'1 Year',price:'₹2,399',period:'for 12 months',detail:'Best long-term value'}
    ].map(plan=><button key={plan.id} className={`plan-card ${selectedPlan===plan.id?'chosen':''}`} onClick={()=>setSelectedPlan(plan.id)}>{plan.popular&&<span className="popular-label">MOST POPULAR</span>}<span className="plan-radio">{selectedPlan===plan.id&&<Check size={12}/>}</span><b>{plan.name}</b><strong>{plan.price}</strong><small>{plan.period}</small><em>{plan.detail}</em></button>)}</div><div className="payment-info"><CreditCard size={18}/><div><b>Secure Razorpay checkout</b><span>The backend creates the order and verifies the payment signature before activating your subscription.</span></div></div>{error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}<div className="subscription-actions"><button className="primary-btn" onClick={startWebPayment} disabled={paymentBusy}>{paymentBusy?'Preparing secure checkout…':'Continue to secure payment'} <ArrowRight size={16}/></button><button className="secondary-btn verify-existing" onClick={()=>verifyParentSubscription(user, true)} disabled={subscriptionLoading}>{subscriptionLoading?'Checking…':"I've already subscribed — verify"} <RefreshCw size={14}/></button><button className="back-link" onClick={()=>setStep('preview')}><ArrowLeft size={14}/> Back to preview</button></div><p className="subscription-footnote">Prices shown are the current plan prices previously provided. The backend remains authoritative for the final payable amount and plan validity.</p></main>}

    {step === 'connect' && user && connected && dashboardOpened ? <ParentDashboard user={user} pairing={pairing} subscription={subscription} onSignOut={logout}/> : step === 'connect' && user && <main className="dashboard">
      <div className="welcome-row"><div><div className="eyebrow">PARENT PORTAL · FINAL STEP</div><h1>Welcome{user.displayName?`, ${user.displayName.split(' ')[0]}`:''}</h1><p className="muted">Your subscription is verified. Now connect your child's device.</p></div><div className="avatar">{(user.displayName||user.email||'P').charAt(0).toUpperCase()}</div></div>
      {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
      <section className="status-card"><div className="status-heading"><div className="status-icon"><ShieldCheck size={22}/></div><div><h2>Your subscription</h2><p className="muted">Your Notivibe plan is verified.</p></div><button className="icon-btn" onClick={()=>verifyParentSubscription()} title="Refresh subscription"><RefreshCw size={17}/></button></div><div className="status-pill active"><CheckCircle2 size={15}/> Subscription active</div></section>
      <section className="connect-card"><div className="section-kicker">DEVICE CONNECTION</div><h2>{connected?'Your family is connected':'Connect your child’s phone'}</h2><p className="muted">{connected?'Your child’s device has successfully joined your family.':'Generate a secure invite link and share it with your child. They will complete setup in the Notivibe Android app.'}</p>
        {connected?<><div className="connected-state"><div className="connected-check"><CheckCircle2 size={28}/></div><div><strong>Child device connected</strong><span>Connection established{pairing?.connectedAt?` · ${new Date(pairing.connectedAt).toLocaleString()}`:''}</span></div><span className="status-pill active">Connected</span></div><button className="primary-btn dashboard-open-btn" onClick={()=>setDashboardOpened(true)}>Open Parent Dashboard <ArrowRight size={17}/></button></>:inviteUrl?<div className="invite-layout"><div className="qr-box"><QRCodeSVG value={inviteUrl} size={174} level="H" includeMargin/><span><QrCode size={14}/> Scan to open invite</span></div><div className="invite-details"><div className="status-pill waiting"><span className="pulse-dot"/> Waiting for child</div><label>Secure invite link</label><div className="copy-field"><input readOnly value={inviteUrl}/><button onClick={copyInvite} title="Copy invite link"><Copy size={17}/></button></div><p className="tiny-note">This invite expires in 15 minutes. If it expires, generate a new link.</p><button className="secondary-btn" onClick={generateInvite} disabled={pairingLoading}><RefreshCw size={15}/> Generate new link</button></div></div>:<div className="generate-panel"><div className="generate-icon"><Link2 size={24}/></div><div><strong>Ready to connect?</strong><p>Generate a one-time invite link for your child's Android phone.</p></div><button className="primary-btn generate-btn" onClick={generateInvite} disabled={pairingLoading}>{pairingLoading?'Generating…':'Generate invite link'} <span>→</span></button></div>}
        {!connected&&<div className="steps"><div><span>1</span><p>Generate your invite</p></div><div><span>2</span><p>Share the link or QR</p></div><div><span>3</span><p>Child opens it in Notivibe</p></div></div>}
      </section><div className="footnote"><Smartphone size={16}/> Child setup and Android permissions are completed on the child's phone in the Notivibe app.</div>
    </main>}

    <footer>© {new Date().getFullYear()} Notivibe · Digital safety for families</footer>
  </div>;
}

function authMessage(code, fallback) {
  const messages = {
    'auth/invalid-credential':'Incorrect email or password.', 'auth/email-already-in-use':'An account already exists with this email.',
    'auth/weak-password':'Use a password with at least 6 characters.', 'auth/invalid-email':'Enter a valid email address.',
    'auth/popup-closed-by-user':'Google sign-in was cancelled.', 'auth/unauthorized-domain':'Add this website domain to Firebase Authentication → Settings → Authorized domains.'
  };
  return messages[code] || fallback || 'Authentication failed.';
}
function GoogleIcon(){return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.73 6C44.44 37.99 46.98 31.9 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
