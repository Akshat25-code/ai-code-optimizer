import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
	theme: 'system', // 'system' | 'dark' | 'light'
	setTheme: () => {},
});

const applyTheme = (theme) => {
	const root = document.documentElement;
	let resolved = theme;
	if (theme === 'system') {
		const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		resolved = prefersDark ? 'dark' : 'light';
	}
	if (resolved === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
};

export const ThemeProvider = ({ children, initial }) => {
	const [theme, setTheme] = useState(() => {
		return initial || localStorage.getItem('theme') || 'system';
	});

	useEffect(() => {
		applyTheme(theme);
		try { localStorage.setItem('theme', theme); } catch {}
	}, [theme]);

	useEffect(() => {
		if (!window.matchMedia) return;
		const m = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => { if (theme === 'system') applyTheme('system'); };
		m.addEventListener?.('change', handler);
		return () => m.removeEventListener?.('change', handler);
	}, [theme]);

	const value = useMemo(() => ({ theme, setTheme }), [theme]);
	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
