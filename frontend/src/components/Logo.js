export default function Logo({ as: Tag = 'h1', className = '' }) {
  return (
    <Tag className={`logo-wrap ${className}`}>
      <span className="logo-word">homie</span>
    </Tag>
  );
}
