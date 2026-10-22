const chat = document.querySelector('#chat-dialog');
const launcher = document.querySelector('#chat-launcher');
launcher.addEventListener('click', () => chat.showModal());
document.querySelector('.close-chat').addEventListener('click', () => chat.close());
chat.addEventListener('click', (event) => {
  const rect = chat.getBoundingClientRect();
  if (event.target === chat && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) chat.close();
});
document.querySelector('#chat-faq').addEventListener('click', () => chat.close());
document.querySelectorAll('[data-interest]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('#interest').value = link.dataset.interest;
  });
});
document.querySelector('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#form-status').textContent = 'This is a website preview. Your details have not been sent or saved.';
});
document.querySelector('#year').textContent = new Date().getFullYear();
