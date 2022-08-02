import Router from "../Router";
import sub2Router from "./sub2";


const sub1Router = new Router();
sub1Router.use("/sub2", sub2Router);

export default sub1Router;
