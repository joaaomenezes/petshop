import Image from "next/image";
import Link from "next/link";
export function CategoryCard({
  name,
  image,
  species = false,
}: {
  name: string;
  image: string;
  species?: boolean;
}) {
  return (
    <Link
      className="category-card"
      href={`/produtos?${species ? "especie" : "categoria"}=${encodeURIComponent(name)}`}
    >
      <Image src={image} alt="" width={180} height={180} />
      <h3>{name}</h3>
    </Link>
  );
}
