import { postDisplayTitle, type PostMetadata } from './post-model';

export function socialMetadata(post: PostMetadata, origin: string) {
  const title = postDisplayTitle(post);
  const description =
    post.description ||
    post.excerpt ||
    (post.bookmarkOf ? `Saved by Martin Emde: ${post.bookmarkOf}` : 'A post by Martin Emde.');
  const image = post.photo[0]?.value || post.image || `/social/${post.slug}.png`;
  return {
    title: title.length > 110 ? `${title.slice(0, 107)}…` : title,
    description,
    url: new URL(`/blog/${post.slug}`, origin).href,
    image: new URL(image, origin).href,
    imageAlt: post.photo[0]?.alt || title,
    generatedImage: !post.photo.length && !post.image
  };
}
