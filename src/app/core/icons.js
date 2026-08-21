export default (modules) => {
    const icons = {};
    Object.entries(modules).forEach(([path, svg]) => {
        const list = path.toLowerCase().split('/');
        const filename = list.pop();
        const iconName = filename.slice(0, -4);
        icons[iconName] = svg;
    });
    // console.log(icons);
    return icons;
};
