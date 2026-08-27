import HeadHome from "./HeadHome";
import EmployeeHome from "./EmployeeHome";

export default function Home({ viewMode = "employee", user, withChrome }) {
  if (viewMode === "head") {
    return <HeadHome user={user} withChrome={withChrome} />;
  }

  return <EmployeeHome user={user} withChrome={withChrome} />;
}
