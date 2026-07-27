import gallery from "./gallery";

const page = {
  ...gallery,
  title: "Vlog - Intexspace Solutions Pvt Ltd",
  body: gallery.body.replace(">Gallery</h1>", ">Vlog</h1>"),
};

export default page;
