/*jslint browser: true */

(function () {
    "use strict";
    var proto,
        glShaders = new Map(),
        vertexShader =
            "attribute vec3 vertex;\n" +
            "attribute vec2 textureCoord;\n" +
            "uniform mat4 modelView;\n" +
            "uniform mat4 perspective;\n" +
            "varying vec2 texCoord;\n" +
            "void main(void) {\n" +
            "    gl_Position = perspective * modelView * vec4(vertex, 1.0);\n" +
            "    texCoord = textureCoord;\n" +
            "}",
        fragmentShader =
            "#ifdef GL_ES\n" +
            "precision lowp float;\n" +
            "#endif\n" +
            "uniform sampler2D tex;\n" +
            "uniform float alpha;\n" +
            "varying vec2 texCoord;\n" +
            "void main(void) {\n" +
            "    vec4 o = texture2D(tex, texCoord);\n" +
            "    gl_FragColor = vec4(0.0, 0.0, 0.0, o.a * alpha);\n" +
            "}";

    function initializeShader(gl) {
        var vert = gl.createShader(gl.VERTEX_SHADER),
            frag = gl.createShader(gl.FRAGMENT_SHADER),
            shader = {
                program: null,
                property: {}
            };

        gl.shaderSource(vert, vertexShader);
        gl.shaderSource(frag, fragmentShader);
        gl.compileShader(vert);
        gl.compileShader(frag);

        shader.program = gl.createProgram();
        gl.attachShader(shader.program, vert);
        gl.attachShader(shader.program, frag);
        gl.linkProgram(shader.program);
        gl.useProgram(shader.program);

        // attributes
        shader.property.vertex = gl.getAttribLocation(shader.program, 'vertex');
        gl.enableVertexAttribArray(shader.property.vertex);

        shader.property.textureCoord = gl.getAttribLocation(shader.program, 'textureCoord');
        gl.enableVertexAttribArray(shader.property.textureCoord);

        // uniforms
        shader.property.tex = gl.getUniformLocation(shader.program, 'tex');
        shader.property.alpha = gl.getUniformLocation(shader.program, 'alpha');

        // matrices
        shader.property.modelView = gl.getUniformLocation(shader.program, 'modelView');
        shader.property.perspective = gl.getUniformLocation(shader.program, 'perspective');
        return shader;
    }
    function getShader(gl) {
        var shader = glShaders.get(gl);
        if (shader) {
            return shader;
        }
        shader = initializeShader(gl);
        glShaders.set(gl, shader);
        return shader;
    }

    function Text(message, font, gl, options) {
        font.addCharacters(message);
        this.message = message;
        this.font = font;
        this.gl = gl;
        if (options) {
            if (!isNaN(options.scale) && options.scale > 0) {
                this.scale = options.scale;
            }
            if (!isNaN(options.size) && options.size > 0) {
                this.size = options.size;
            }
            if (!isNaN(options.size) && options.size > 0) {
                this.size = options.size;
            }
        }
        this.createBuffer();
    }
    proto = Text.prototype;
    proto.message = '';
    proto.lines = 1;
    proto.scale = 1;
    proto.size = 16;
    proto.italic = false;
    proto.bold = false;
    proto.triangles = 0;
    proto.vertices = null;
    proto.textureCoords = null;

    Object.defineProperties(
        proto,
        {
            'width': {
                get: function () {
                    return this.bufferWidth;
                }
            },
            'height': {
                get: function () {
                    return this.size * this.font.lineSize * this.lines;
                }
            }
        }
    );
    proto.createBuffer = function () {
        var font = this.font,
            triangles = 0,
            verticesArray = [],
            texturesArray = [],
            chars = this.message.split(''),
            x = 0,
            y = 0,
            gl = this.gl,
            buffer,
            char,
            ct,
            cx,
            cy,
            cw,
            ch,
            i,
            l;
        for (i = 0, l = chars.length; i < l; i += 1) {
            char = font.getCharacter(chars[i]);
            cw = char.width;
            ch = char.height;
            ct = char.textureCoords;
            if (ct) {
                verticesArray.push(x, y, 0);
                verticesArray.push(x + cw, y, 0);
                verticesArray.push(x, y + ch, 0);

                verticesArray.push(x + cw, y, 0);
                verticesArray.push(x, y + ch, 0);
                verticesArray.push(x + cw, y + ch, 0);

                cx = ct.x;
                cy = ct.y;
                cw = ct.width;
                ch = ct.height;
                texturesArray.push(cx, cy);
                texturesArray.push(cx + cw, cy);
                texturesArray.push(cx, cy + ch);

                texturesArray.push(cx + cw, cy);
                texturesArray.push(cx, cy + ch);
                texturesArray.push(cx + cw, cy + ch);

                triangles += 6;
            }
            x += char.width;
        }
        console.log(verticesArray, texturesArray);
        this.triangles = triangles;

        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesArray), gl.STATIC_DRAW);
        this.vertices = buffer;

        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texturesArray), gl.STATIC_DRAW);
        this.textureCoords = buffer;
    };
    proto.updateBuffer = function () {
        throw "Not implemented";
    };
    proto.destroy = function () {
        var gl = this.gl;
        if (gl.isBuffer(this.vertices)) {
            gl.deleteBuffer(this.vertices);
        }
        if (gl.isBuffer(this.textureCoords)) {
            gl.deleteBuffer(this.textureCoords);
        }
        delete this.vertices;
        delete this.textureCoords;
        delete this.message;
        this.font = null;
        this.gl = null;
    };
    proto.update = function (message, font, options) {
        font.addCharacters(message);
    };
    proto.render = function (perspective, modelView) {
        var gl = this.gl,
            shader = getShader(gl),
            texture = this.font.texture;
        if (!texture || !shader) {
            return;
        }
        gl.useProgram(shader.program);
        gl.uniform1f(shader.property.alpha, 1);
        gl.uniformMatrix4fv(shader.property.perspective, false, perspective);
        gl.uniformMatrix4fv(shader.property.modelView, false, modelView);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(shader.tex, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
        gl.vertexAttribPointer(shader.property.vertex, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoords);
        gl.vertexAttribPointer(shader.property.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, this.triangles);
    };

    window.Text = Text;
}());