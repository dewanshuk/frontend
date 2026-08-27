import { MemoryRouter } from 'react-router-dom'

export const useNavigate = jest.fn(() => jest.fn())
export const useParams = jest.fn(() => ({}))
export const useLocation = jest.fn(() => ({ pathname: '/', search: '', hash: '', state: null }))
export const Link = ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
export const NavLink = ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
export const Navigate = ({ to }) => <div data-testid="navigate" data-to={to} />
export const Outlet = () => <div data-testid="outlet" />
export const Routes = ({ children }) => <div data-testid="routes">{children}</div>
export const Route = ({ element }) => <div data-testid="route">{element}</div>

export { MemoryRouter }
