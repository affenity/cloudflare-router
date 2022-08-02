import Router from "../Router";
import sub3Router from "./sub3";


const sub2Router = new Router();
sub2Router.use("/sub2", sub3Router);

export default sub2Router;
