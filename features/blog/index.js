async function getPosts() {
    const postContainer = document.getElementById('posts-container');
    try {
        // this endpoint will return 404
        const response = await fetch(`${API_BLOG_URL}/api/blog/`);
        const posts = await response.json();
        postContainer.innerHTML = posts.map(getPostCard).join('');
    } catch {
        postContainer.innerHTML = '<div><img src="../../assets/error.png" alt="error"><p class="text-2xl mt-2 text-center">Oops!, Something went wrong...</p></div>'
    }
}

function getPostCard(post) {
    return `
    <div class="w-full p-4 border border-white rounded-lg">
        <div class="text-lg font-bold text-center">${post.title}</div>
        <div class="py-4">${post.content}</div>
        <div class="text-xs text-right text-gray-400">${convertDate(post.createdAt)}</div>
    </div>
    `;
}

function convertDate(isoDate) {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}/${month}/${day}`;
}

window.onload = getPosts;
