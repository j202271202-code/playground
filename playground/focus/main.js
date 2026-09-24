document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); $('toggle').click(); }
});

renderList();
renderTimer();
