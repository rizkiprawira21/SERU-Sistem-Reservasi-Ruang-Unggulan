/* SERU — demo sign in */

(function () {
  let role = 'pemohon';

  function $(id) { return document.getElementById(id); }

  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  document.addEventListener('DOMContentLoaded', function () {
    const typeSelect = $('login-type');
    APPLICANT_TYPES.forEach(function (t) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });

    fillDemo(role);

    document.querySelectorAll('.role-switch__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        role = btn.getAttribute('data-role');
        document.querySelectorAll('.role-switch__btn').forEach(function (b) {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        fillDemo(role);
      });
    });

    $('login-form').addEventListener('submit', submit);
  });

  function fillDemo(selectedRole) {
    const demo = DEMO_USERS[selectedRole];
    $('login-name').value = demo.name;
    $('login-identity').value = demo.identity;
    $('login-email').value = demo.email;
    $('login-type').value = demo.type;
    $('login-type').disabled = selectedRole === 'admin';
    $('identity-label').textContent = selectedRole === 'admin' ? 'NIP / ID Staf' : 'NIM / NIDN / NIP';
  }

  function submit(event) {
    event.preventDefault();
    const name = $('login-name').value.trim();
    const identity = $('login-identity').value.trim();
    const email = $('login-email').value.trim();

    if (!name || !identity || !email) {
      showToast('Lengkapi nama, identitas, dan email terlebih dahulu.', 'error');
      return;
    }

    const demo = DEMO_USERS[role];
    const user = {
      role: role,
      name: name,
      identity: identity,
      type: role === 'admin' ? 'Staf' : $('login-type').value,
      email: email,
      whatsapp: demo.whatsapp,
      org: role === 'admin' ? demo.org : '',
      position: role === 'admin' ? demo.position : ''
    };

    setCurrentUser(user);
    showToast('Selamat datang, ' + name.split(' ')[0] + '.', 'success');
    const target = next || (role === 'admin' ? 'staf.html' : 'riwayat.html');
    setTimeout(function () { window.location.href = target; }, 350);
  }
})();
